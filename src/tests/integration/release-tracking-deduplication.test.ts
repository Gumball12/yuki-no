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

describe('Integration: releaseTrackingFlow dedup opened + created', () => {
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

  it('processes unique issues only when opened and created overlap', async () => {
    vi.spyOn(Git.prototype, 'clone').mockImplementation(() => {});

    const commits = [
      {
        hash: 'aaaaaaa',
        title: 'feat A',
        date: '2023-01-01T10:00:00Z',
        files: ['docs/a.md'],
      },
      {
        hash: 'bbbbbbb',
        title: 'feat B',
        date: '2023-01-01T11:00:00Z',
        files: ['docs/b.md'],
      },
    ];

    // Git.exec controls
    vi.spyOn(Git.prototype, 'exec').mockImplementation(cmd => {
      const c = String(cmd);

      if (c.startsWith('log ')) {
        return makeLog(commits);
      }

      if (c === 'tag') {
        return '';
      }

      if (c.startsWith('tag --contains')) {
        return '';
      }

      return '';
    });

    // Initial run create issues for A and B
    nock(API)
      .get('/repos/up_owner/up_repo/actions/runs')
      .query(true)
      .reply(200, actionsCompletedRunsEmpty);
    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, issuesEmpty);
    nock(API).get('/search/issues').query(true).reply(200, { items: [] });

    const issueNums: number[] = [];
    nock(API)
      .post('/repos/up_owner/up_repo/issues')
      .times(2)
      .reply(201, () => {
        const num = 4000 + issueNums.length;
        issueNums.push(num);
        return createdIssueResponse(num);
      });

    const { config, git, github } = createRuntime();
    const created = await syncCommitsFlow(github, git, config);
    expect(created.length).toBe(2);

    // Now opened issues includes only B (duplicate)
    const issueBNum = issueNums[1];
    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, [
        {
          number: issueBNum,
          body: `https://github.com/head_owner/head_repo/commit/${commits[1].hash}`,
          created_at: '2023-01-01T12:00:00Z',
          labels: ['sync'],
        },
      ]);

    // For each unique issue (A and B), we expect label set(pending added) and a comment
    for (const num of issueNums) {
      nock(API)
        .get(`/repos/up_owner/up_repo/issues/${num}/comments`)
        .reply(200, listCommentsFixture([]));
      nock(API)
        .put(`/repos/up_owner/up_repo/issues/${num}/labels`, body => {
          if (!hasLabelsArray(body)) {
            return false;
          }

          return body.labels.includes('pending');
        })
        .reply(200, labelsFixture('sync', 'pending'));
      nock(API)
        .post(`/repos/up_owner/up_repo/issues/${num}/comments`)
        .reply(201, {});
    }

    await releaseTrackingFlow(github, git, created);
  });
});
