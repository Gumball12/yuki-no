import { createRuntime, syncCommitsFlow } from '../../app';
import { Git } from '../../git/core';
import { GITHUB_API as API } from '../helpers/constants';
import { setEnv } from '../helpers/env';
import { makeLog } from '../helpers/git';

import nock from 'nock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Integration: lookupCommitsInIssues chunking (>5 commits)', () => {
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

  it('search is called per chunk and only non-existing commits create issues', async () => {
    vi.spyOn(Git.prototype, 'clone').mockImplementation(() => {});

    const commits = Array.from({ length: 12 }, (_, i) => ({
      hash: `${(i + 1).toString().repeat(7).slice(0, 7)}`,
      title: `feat: ${i + 1}`,
      date: `2023-01-01T${String(10 + i).padStart(2, '0')}:00:00Z`,
      files: ['docs/x.md'],
    }));

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

    // actions runs, issues list
    nock(API)
      .get('/repos/up_owner/up_repo/actions/runs')
      .query(true)
      .reply(200, { total_count: 0, workflow_runs: [] });
    nock(API).get('/repos/up_owner/up_repo/issues').query(true).reply(200, []);

    // Three search calls for three chunks (5/5/2)
    // First chunk (5): mark 3 existing
    nock(API)
      .get('/search/issues')
      .query(true)
      .reply(200, {
        items: [0, 1, 2].map(ind => ({
          body: `https://github.com/head_owner/head_repo/commit/${commits[ind].hash}`,
        })),
      });
    // Second chunk (5): mark 2 existing
    nock(API)
      .get('/search/issues')
      .query(true)
      .reply(200, {
        items: [5, 7].map(ind => ({
          body: `https://github.com/head_owner/head_repo/commit/${commits[ind].hash}`,
        })),
      });
    // Third chunk (2): mark 1 existing
    nock(API)
      .get('/search/issues')
      .query(true)
      .reply(200, {
        items: [10].map(ind => ({
          body: `https://github.com/head_owner/head_repo/commit/${commits[ind].hash}`,
        })),
      });

    // Created issues = (5-3)+(5-2)+(2-1)=6
    const createIssue = nock(API)
      .post('/repos/up_owner/up_repo/issues')
      .times(6)
      .reply(201, { number: 2000, created_at: '2023-01-01T20:00:00Z' });

    const { config, git, github } = createRuntime();
    const created = await syncCommitsFlow(github, git, config);

    expect(created.length).toBe(6);
    expect(createIssue.isDone()).toBe(true);
  });
});
