import { createRuntime, releaseTrackingFlow, syncCommitsFlow } from '../../app';
import { Git } from '../../git/core';
import {
  actionsCompletedRunsEmpty,
  createdIssueResponse,
  issuesEmpty,
  labels as labelsFixture,
  listComments as listCommentsFixture,
} from '../fixtures/mocks/github';
import { GITHUB_API as API } from '../helpers/constants';
import { setEnv } from '../helpers/env';
import { makeLog } from '../helpers/git';

import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type WithBody = { body?: unknown };
const hasBodyString = (v: unknown): v is { body: string } => {
  if (typeof v !== 'object' || v === null) {
    return false;
  }

  const b = v as WithBody;
  return typeof b.body === 'string';
};

describe('Integration: Release Tracking - Comments (Nock)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();

    setEnv({
      ACCESS_TOKEN: 'token',
      USER_NAME: 'bot',
      EMAIL: 'bot@example.com',
      HEAD_REPO: 'https://github.com/head_owner/head_repo.git',
      HEAD_REPO_BRANCH: 'main',
      UPSTREAM_REPO: 'https://github.com/up_owner/up_repo.git',
      TRACK_FROM: 'abc0000',
      MAYBE_FIRST_RUN: 'true',
      RELEASE_TRACKING: 'true',
      RELEASE_TRACKING_LABELS: 'pending',
      LABELS: 'sync',
    });
  });

  it('adds comment none -> prerelease -> release and avoids duplicates', async () => {
    vi.spyOn(Git.prototype, 'clone').mockImplementation(() => {});

    const commit = {
      hash: 'bbbbbbb',
      title: 'feat',
      date: '2023-01-01T10:00:00Z',
      files: ['docs/c.md'],
    };
    let state: 'none' | 'pre' | 'rel' = 'none';

    vi.spyOn(Git.prototype, 'exec').mockImplementation(cmd => {
      const c = String(cmd);
      if (c.startsWith('log ')) {
        return makeLog(commit);
      }

      if (c === 'tag') {
        return state === 'none'
          ? ''
          : state === 'pre'
            ? 'v4.0.0-beta.1'
            : 'v4.0.0';
      }

      if (c.startsWith('tag --contains')) {
        return state === 'none'
          ? ''
          : state === 'pre'
            ? 'v4.0.0-beta.1'
            : 'v4.0.0\nv4.0.0-beta.1';
      }

      return '';
    });

    // Create issue
    nock(API)
      .get('/repos/up_owner/up_repo/actions/runs')
      .query(true)
      .reply(200, actionsCompletedRunsEmpty);
    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, issuesEmpty);
    nock(API).get('/search/issues').query(true).reply(200, { items: [] });

    const issueNum = 4321;
    nock(API)
      .post('/repos/up_owner/up_repo/issues')
      .reply(201, createdIssueResponse(issueNum));

    const { config, git, github } = createRuntime();
    const created = await syncCommitsFlow(github, git, config);
    expect(created.length).toBe(1);

    // none: listComments -> [], setLabels -> pending, createComment contains none/none + guidance
    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, issuesEmpty);
    nock(API)
      .put(`/repos/up_owner/up_repo/issues/${issueNum}/labels`)
      .reply(200, labelsFixture('sync', 'pending'));
    nock(API)
      .get(`/repos/up_owner/up_repo/issues/${issueNum}/comments`)
      .reply(200, listCommentsFixture([]));
    const c1 = nock(API)
      .post(
        `/repos/up_owner/up_repo/issues/${issueNum}/comments`,
        body =>
          hasBodyString(body) &&
          body.body.includes('- pre-release: none') &&
          body.body.includes('- release: none'),
      )
      .reply(201, {});

    await releaseTrackingFlow(github, git, created);
    expect(c1.isDone()).toBe(true);

    // pre: listComments -> [prev], setLabels -> pending (again), createComment includes prerelease link and release none
    state = 'pre';
    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, issuesEmpty);
    nock(API)
      .put(`/repos/up_owner/up_repo/issues/${issueNum}/labels`)
      .reply(200, labelsFixture('sync', 'pending'));
    nock(API)
      .get(`/repos/up_owner/up_repo/issues/${issueNum}/comments`)
      .reply(
        200,
        listCommentsFixture(['- pre-release: none\n- release: none']),
      );
    const c2 = nock(API)
      .post(
        `/repos/up_owner/up_repo/issues/${issueNum}/comments`,
        body =>
          hasBodyString(body) &&
          body.body.includes('pre-release: [v4.0.0-beta.1]') &&
          body.body.includes('/releases/tag/v4.0.0-beta.1') &&
          body.body.includes('release: none'),
      )
      .reply(201, {});

    await releaseTrackingFlow(github, git, created);
    expect(c2.isDone()).toBe(true);

    // rel: listComments -> [prev], setLabels -> remove pending, createComment includes both links
    state = 'rel';
    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, issuesEmpty);
    nock(API)
      .put(`/repos/up_owner/up_repo/issues/${issueNum}/labels`)
      .reply(200, labelsFixture('sync'));
    nock(API)
      .get(`/repos/up_owner/up_repo/issues/${issueNum}/comments`)
      .reply(
        200,
        listCommentsFixture([
          '- pre-release: [v4.0.0-beta.1](https://github.com/head_owner/head_repo/releases/tag/v4.0.0-beta.1)\n- release: none',
        ]),
      );
    const c3 = nock(API)
      .post(
        `/repos/up_owner/up_repo/issues/${issueNum}/comments`,
        body =>
          hasBodyString(body) &&
          body.body.includes('pre-release: [v4.0.0-beta.1]') &&
          body.body.includes('release: [v4.0.0]'),
      )
      .reply(201, {});

    await releaseTrackingFlow(github, git, created);
    expect(c3.isDone()).toBe(true);

    // rerun no-change: should not create another comment
    nock(API).get('/repos/up_owner/up_repo/issues').query(true).reply(200, []);
    nock(API)
      .get(`/repos/up_owner/up_repo/issues/${issueNum}/comments`)
      .reply(200, [
        {
          body: '- pre-release: [v4.0.0-beta.1](https://github.com/head_owner/head_repo/releases/tag/v4.0.0-beta.1)\n- release: [v4.0.0](https://github.com/head_owner/head_repo/releases/tag/v4.0.0)',
        },
      ]);
    const c4 = nock(API)
      .post(`/repos/up_owner/up_repo/issues/${issueNum}/comments`)
      .reply(201, {});

    await releaseTrackingFlow(github, git, created);
    expect(c4.isDone()).toBe(false);
  });
});
