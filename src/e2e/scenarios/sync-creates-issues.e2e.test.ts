import { parseLabels } from '../helpers/env';
import { cleanup, makeCommits, setup, withBranch } from '../helpers/fixture';
import { getCreatedIssues } from '../helpers/github';
import { runAction } from '../helpers/spawn';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let s: Awaited<ReturnType<typeof setup>>;

const NUM_COMMITS = 3;
const WAIT_FOR_ISSUES_MS = 15000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('E2E: Sync Creates Issues', () => {
  beforeAll(async () => {
    s = await setup();
  });

  afterAll(async () => {
    await cleanup(s);
  });

  it(`should create ${NUM_COMMITS} issues from ${NUM_COMMITS} commits`, async () => {
    await withBranch(s, async ({ baseSha, branch }) => {
      const shas = await makeCommits(s, branch, NUM_COMMITS);
      const startTime = new Date();

      const result = await runAction({
        ACCESS_TOKEN: s.env.accessToken,
        HEAD_REPO: s.env.headRepoUrl,
        HEAD_REPO_BRANCH: branch,
        UPSTREAM_REPO: s.env.upstreamRepoUrl,
        TRACK_FROM: baseSha,
        MAYBE_FIRST_RUN: 'true',
      });
      expect(result.exitCode).toBe(0);

      await sleep(WAIT_FOR_ISSUES_MS);

      const issues = await getCreatedIssues(
        s.octokit,
        s.upstreamRepo,
        startTime,
        shas,
      );

      for (const issue of issues) {
        s.cleanup.issues.push({
          owner: s.upstreamRepo.owner,
          repo: s.upstreamRepo.repo,
          number: issue.number,
        });
      }

      expect(issues.length).toBe(shas.length);
      for (const sha of shas) {
        expect(
          issues.some(issue => issue.body?.includes(`/commit/${sha}`)),
        ).toBe(true);
      }

      for (const issue of issues) {
        expect(issue.title).toContain('test: Add e2e test file');
        if (s.env.labels) {
          const expected = parseLabels(s.env.labels);
          const labels =
            issue.labels?.map(l => (typeof l === 'string' ? l : l.name)) ?? [];
          for (const e of expected) expect(labels).toContain(e);
        }
      }
    });
  });
});
