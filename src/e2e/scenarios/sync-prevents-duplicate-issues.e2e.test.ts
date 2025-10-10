import { cleanup, makeCommits, setup, withBranch } from '../helpers/fixture';
import { getCreatedIssues } from '../helpers/github';
import { runAction } from '../helpers/spawn';
import { expectIssuesForCommits, sleep } from '../helpers/utils';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let s: Awaited<ReturnType<typeof setup>>;

const WAIT_FOR_ISSUES_MS = 5000;

describe('E2E: Sync Prevents Duplicate Issues', () => {
  beforeAll(async () => {
    s = await setup();
  });

  afterAll(async () => {
    await cleanup(s);
  });

  it('should handle multiple incremental batches with duplicate prevention', async () => {
    await withBranch(s, async ({ baseSha, branch }) => {
      const allShas: string[] = [];
      const batchSizes = [3, 2, 1, 2];
      const startTime = new Date();
      let fileIndex = 1;

      // Run multiple batches incrementally
      // Note: All runs use MAYBE_FIRST_RUN='true' because E2E environment cannot
      // create workflow run records. This tests that lookupCommitsInIssues
      // properly prevents duplicates across multiple runs.
      for (let i = 0; i < batchSizes.length; i++) {
        const batchSize = batchSizes[i];
        const batchShas = await makeCommits(s, branch, batchSize, fileIndex);
        fileIndex += batchSize;
        allShas.push(...batchShas);

        console.log(
          `[E2E] Batch ${i + 1}: Creating ${batchSize} commits, total: ${allShas.length}`,
        );

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

        // Wait between batches
        if (i < batchSizes.length - 1) {
          await sleep(10000);
        }
      }

      // Verify total number of issues matches total commits
      const totalExpected = batchSizes.reduce((sum, size) => sum + size, 0);
      const allIssues = await getCreatedIssues(
        s.octokit,
        s.upstreamRepo,
        startTime,
        allShas,
      );
      expect(allIssues.length).toBe(totalExpected);

      for (const issue of allIssues) {
        s.cleanup.issues.push({
          owner: s.upstreamRepo.owner,
          repo: s.upstreamRepo.repo,
          number: issue.number,
        });
      }

      // Verify no duplicates
      const issueNumbers = allIssues.map(i => i.number);
      const uniqueIssueNumbers = [...new Set(issueNumbers)];
      expect(uniqueIssueNumbers.length).toBe(issueNumbers.length);

      expectIssuesForCommits(allIssues, allShas);
    });
  });
});
