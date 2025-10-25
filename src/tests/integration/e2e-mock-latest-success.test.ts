import { createRuntime, syncCommitsFlow } from '../../app';
import { Git } from '../../git/core';
import {
  actionsCompletedRunsEmpty,
  issuesEmpty,
} from '../fixtures/mocks/github';
import { GITHUB_API as API } from '../helpers/constants';
import { setEnv } from '../helpers/env';
import { makeLog } from '../helpers/git';

import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Integration: E2E_MOCK_LATEST_SUCCESS_AT boundary', () => {
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
      E2E_MOCK_LATEST_SUCCESS_AT: '2023-01-01T12:00:00Z',
    });
  });

  it('creates issues only for commits after mocked latest success timestamp', async () => {
    vi.spyOn(Git.prototype, 'clone').mockImplementation(() => {});

    const commits = [
      {
        hash: '1111111',
        title: 'feat: before',
        date: '2023-01-01T11:00:00Z',
        files: ['docs/a.md'],
      },
      {
        hash: '2222222',
        title: 'feat: after',
        date: '2023-01-01T13:00:00Z',
        files: ['docs/b.md'],
      },
      {
        hash: '3333333',
        title: 'feat: after2',
        date: '2023-01-01T14:00:00Z',
        files: ['docs/c.md'],
      },
    ];

    vi.spyOn(Git.prototype, 'exec').mockImplementation(cmd => {
      const c = String(cmd);
      if (c.startsWith('log ')) {
        const m = c.match(/--since="([^"]+)"/);
        const since = m ? new Date(m[1]) : undefined;
        const filtered = since
          ? commits.filter(e => new Date(e.date) > since)
          : commits;
        return makeLog(filtered);
      }

      if (c === 'tag') {
        return '';
      }

      return '';
    });

    // Issues list empty, search empty
    nock(API)
      .get('/repos/up_owner/up_repo/actions/runs')
      .query(true)
      .reply(200, actionsCompletedRunsEmpty);
    nock(API)
      .get('/repos/up_owner/up_repo/issues')
      .query(true)
      .reply(200, issuesEmpty);
    nock(API).get('/search/issues').query(true).reply(200, { items: [] });

    const createIssue = nock(API)
      .post('/repos/up_owner/up_repo/issues')
      .times(2) // only 2222222 and 3333333
      .reply(201, () => ({
        number: 1000,
        created_at: '2023-01-01T15:00:00Z',
      }));

    const { config, git, github } = createRuntime();
    const created = await syncCommitsFlow(github, git, config);

    expect(created.length).toBe(2);
    expect(createIssue.isDone()).toBe(true);
  });
});
