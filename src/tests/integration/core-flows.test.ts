import { createRuntime, syncCommitsFlow } from '../../app';
import { Git } from '../../git/core';
import {
  actionsCompletedRunsEmpty,
  createdIssueResponse,
  issuesEmpty,
  searchItems,
} from '../fixtures/mocks/github';
import { GITHUB_API as API } from '../helpers/constants';
import { setEnv } from '../helpers/env';
import { makeLog } from '../helpers/git';

import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Integration: Core flows (Nock)', () => {
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
      RELEASE_TRACKING: 'false',
      LABELS: 'sync',
    });
  });

  it('creates issues for commits and prevents duplicates on rerun', async () => {
    // Mock Git behavior
    vi.spyOn(Git.prototype, 'clone').mockImplementation(() => {});

    const commits = [
      {
        hash: '1111111',
        title: 'feat: one',
        date: '2023-01-01T10:00:00Z',
        files: ['docs/a.md'],
      },
      {
        hash: '2222222',
        title: 'fix: two',
        date: '2023-01-01T11:00:00Z',
        files: ['docs/b.md'],
      },
    ];

    vi.spyOn(Git.prototype, 'exec').mockImplementation(cmd => {
      const c = String(cmd);

      if (c.startsWith('log ')) {
        return makeLog(commits);
      }

      if (c === 'tag') {
        return '';
      }

      return '';
    });

    // First run: actions.runs -> none, issues(all) -> [], search -> none, create issues -> 2
    nock(API)
      .get('/repos/up_owner/up_repo/actions/runs')
      .query(q => String(q.status) === 'completed')
      .reply(200, actionsCompletedRunsEmpty);

    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, issuesEmpty);

    nock(API).get('/search/issues').query(true).reply(200, searchItems([]));

    const createIssue1 = nock(API)
      .post('/repos/up_owner/up_repo/issues')
      .times(commits.length)
      .reply(() => {
        const num = Math.floor(Math.random() * 10000);
        return [201, createdIssueResponse(num)];
      });

    const { config, git, github } = createRuntime();

    const created = await syncCommitsFlow(github, git, config);
    expect(created.length).toBe(commits.length);
    expect(createIssue1.isDone()).toBe(true);

    // Second run: search shows all commits already present -> no new issue
    nock(API)
      .get('/repos/up_owner/up_repo/actions/runs')
      .query(true)
      .reply(200, actionsCompletedRunsEmpty);

    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, issuesEmpty);

    nock(API)
      .get('/search/issues')
      .query(true)
      .reply(200, searchItems(commits.map(c => c.hash)));

    const createIssue2 = nock(API)
      .post('/repos/up_owner/up_repo/issues')
      .reply(201, createdIssueResponse(9999));

    const created2 = await syncCommitsFlow(github, git, config);
    expect(created2.length).toBe(0);
    expect(createIssue2.isDone()).toBe(false); // should not be called
  });
});
