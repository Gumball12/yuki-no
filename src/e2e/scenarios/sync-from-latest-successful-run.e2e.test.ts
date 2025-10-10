import { cleanup, makeCommits, setup, withBranch } from '../helpers/fixture';
import { getCreatedIssues } from '../helpers/github';
import { runAction } from '../helpers/spawn';
import { expectIssuesForCommits, sleep } from '../helpers/utils';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let s: Awaited<ReturnType<typeof setup>>;

const WAIT_FOR_ISSUES_MS = 5000;

describe('E2E: Sync From Latest Successful Run', () => {
  beforeAll(async () => {
    s = await setup();
  });

  afterAll(async () => {
    await cleanup(s);
  }, 30000);

  it('should respect TRACK_FROM boundary (commits before TRACK_FROM not synced)', async () => {
    await withBranch(s, async ({ baseSha, branch }) => {
      // baseSha is the boundary - only commits after this should be tracked
      const afterShas = await makeCommits(s, branch, 3);
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

      // Only commits after TRACK_FROM should create issues
      const issues = await getCreatedIssues(
        s.octokit,
        s.upstreamRepo,
        startTime,
        afterShas,
      );
      expect(issues.length).toBe(3);

      // Verify these are exactly the afterShas commits
      expectIssuesForCommits(issues, afterShas);

      for (const issue of issues) {
        s.cleanup.issues.push({
          owner: s.upstreamRepo.owner,
          repo: s.upstreamRepo.repo,
          number: issue.number,
        });
      }
    });
  });

  it('should create issues only for commits after the latest successful run (mocked)', async () => {
    await withBranch(s, async ({ baseSha, branch }) => {
      // First, create commits that will be BEFORE the mocked latest successful run
      const beforeShas = await makeCommits(s, branch, 2);

      // We intentionally mock ONLY the GitHub Actions workflow runs API here.
      // Reason:
      // - In our E2E environment we cannot create real workflow run records.
      // - getLatestSuccessfulRunISODate relies on Actions runs to compute the --since boundary.
      // - Other GitHub API calls (creating commits/issues, listing issues) remain REAL to preserve end-to-end behavior.
      //   This ensures we are only stubbing the unavailable piece of infrastructure while validating the rest of the flow.

      // Add buffer to avoid boundary flakiness between commit timestamps and the mocked run time
      await sleep(3000);
      const lastSuccessAt = new Date().toISOString();

      // Create commits that will be AFTER the mocked latest successful run
      // Extra buffer to guarantee author timestamps strictly after lastSuccessAt (seconds precision)
      await sleep(3000);
      const afterShas = await makeCommits(s, branch, 3, 3);

      // Provide the mocked last successful run timestamp to the child process via env var.
      // This leverages the E2E hook in getLatestSuccessfulRunISODate, ensuring only commits AFTER this
      // point are considered, while all other API calls remain real.
      const runStart = new Date();
      const result = await runAction({
        E2E_MOCK_LATEST_SUCCESS_AT: lastSuccessAt,
        ACCESS_TOKEN: s.env.accessToken,
        HEAD_REPO: s.env.headRepoUrl,
        HEAD_REPO_BRANCH: branch,
        UPSTREAM_REPO: s.env.upstreamRepoUrl,
        TRACK_FROM: baseSha, // Intentionally earlier than lastSuccessAt so --since boundary is effective
        MAYBE_FIRST_RUN: 'false', // Simulate non-first run scenario
      });
      expect(result.exitCode).toBe(0);

      await sleep(WAIT_FOR_ISSUES_MS);

      // Only commits AFTER last successful run should create issues
      const issuesAfter = await getCreatedIssues(
        s.octokit,
        s.upstreamRepo,
        runStart,
        afterShas,
      );
      expect(issuesAfter.length).toBe(afterShas.length);
      expectIssuesForCommits(issuesAfter, afterShas);

      // Ensure commits BEFORE last successful run did NOT create issues in this run
      const issuesBefore = await getCreatedIssues(
        s.octokit,
        s.upstreamRepo,
        runStart,
        beforeShas,
      );
      expect(issuesBefore.length).toBe(0);

      for (const issue of issuesAfter) {
        s.cleanup.issues.push({
          owner: s.upstreamRepo.owner,
          repo: s.upstreamRepo.repo,
          number: issue.number,
        });
      }
    });
  });
});
