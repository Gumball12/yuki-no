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

type WithLabels = { labels?: unknown[] };
const hasLabelsArray = (v: unknown): v is { labels: unknown[] } => {
  if (typeof v !== 'object' || v === null) {
    return false;
  }

  const b = v as WithLabels;
  return Array.isArray(b.labels);
};

describe('Integration: Release Tracking - Labels (Nock)', () => {
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

  it('adds pending label when unreleased, removes it when released', async () => {
    vi.spyOn(Git.prototype, 'clone').mockImplementation(() => {});

    const commit = {
      hash: 'aaaaaaa',
      title: 'feat',
      date: '2023-01-01T10:00:00Z',
      files: ['docs/a.md'],
    };
    let releaseState: 'none' | 'released' = 'none';

    vi.spyOn(Git.prototype, 'exec').mockImplementation(cmd => {
      const c = String(cmd);
      if (c.startsWith('log ')) {
        return makeLog(commit);
      }

      if (c === 'tag') {
        return releaseState === 'none' ? '' : 'v2.0.0';
      }

      if (c.startsWith('tag --contains')) {
        return releaseState === 'none' ? '' : 'v2.0.0';
      }

      return '';
    });

    // First run: create issue
    nock(API)
      .get('/repos/up_owner/up_repo/actions/runs')
      .query(true)
      .reply(200, actionsCompletedRunsEmpty);

    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, issuesEmpty);
    nock(API).get('/search/issues').query(true).reply(200, { items: [] });

    const createdIssueNum = 1234;
    nock(API)
      .post('/repos/up_owner/up_repo/issues')
      .reply(201, createdIssueResponse(createdIssueNum));

    const { config, git, github } = createRuntime();
    const created = await syncCommitsFlow(github, git, config);
    expect(created.length).toBe(1);

    // Release tracking (unreleased): expect setLabels includes pending
    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, issuesEmpty);
    nock(API)
      .get(`/repos/up_owner/up_repo/issues/${createdIssueNum}/comments`)
      .reply(200, listCommentsFixture([]));

    const setLabelsPending = nock(API)
      .put(`/repos/up_owner/up_repo/issues/${createdIssueNum}/labels`, body => {
        if (!hasLabelsArray(body)) {
          return false;
        }

        return body.labels.includes('pending');
      })
      .reply(200, labelsFixture('sync', 'pending'));

    // Comment creation (informational + none/none)
    nock(API)
      .post(`/repos/up_owner/up_repo/issues/${createdIssueNum}/comments`)
      .reply(201, {});

    await releaseTrackingFlow(github, git, created);
    expect(setLabelsPending.isDone()).toBe(true);

    // Now mark as released and run again: pending should be removed
    releaseState = 'released';

    // Provide opened issue with pending label so remover path is taken
    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, [
        {
          number: createdIssueNum,
          body: `https://github.com/head_owner/head_repo/commit/${commit.hash}`,
          created_at: '2023-01-01T12:00:00Z',
          labels: ['sync', { name: 'pending' }],
        },
      ]);
    nock(API)
      .get(`/repos/up_owner/up_repo/issues/${createdIssueNum}/comments`)
      .reply(200, listCommentsFixture([]));

    const setLabelsReleased = nock(API)
      .put(`/repos/up_owner/up_repo/issues/${createdIssueNum}/labels`, body => {
        if (!hasLabelsArray(body)) {
          return false;
        }

        return !body.labels.includes('pending');
      })
      .reply(200, labelsFixture('sync'));

    // Comment creation after release
    nock(API)
      .post(`/repos/up_owner/up_repo/issues/${createdIssueNum}/comments`)
      .reply(201, {});

    await releaseTrackingFlow(github, git, created);
    expect(setLabelsReleased.isDone()).toBe(true);
  });
});
