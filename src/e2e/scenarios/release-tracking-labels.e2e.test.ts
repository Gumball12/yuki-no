import { parseLabels } from '../helpers/env';
import { cleanup, makeCommits, setup, withBranch } from '../helpers/fixture';
import { createTag, getCreatedIssues } from '../helpers/github';
import { runAction } from '../helpers/spawn';
import { expectLabels, sleep } from '../helpers/utils';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let s: Awaited<ReturnType<typeof setup>>;

const WAIT_FOR_ISSUES_MS = 5000;

describe('E2E: Release Tracking - Labels', () => {
  beforeAll(async () => {
    s = await setup();
  });

  afterAll(async () => {
    await cleanup(s);
  }, 30000); // 30 seconds for cleanup

  it('should add pending label when commit is not released', async () => {
    await withBranch(s, async ({ baseSha, branch }) => {
      const shas = await makeCommits(s, branch, 1);
      const startTime = new Date();

      const result = await runAction({
        ACCESS_TOKEN: s.env.accessToken,
        HEAD_REPO: s.env.headRepoUrl,
        HEAD_REPO_BRANCH: branch,
        UPSTREAM_REPO: s.env.upstreamRepoUrl,
        TRACK_FROM: baseSha,
        MAYBE_FIRST_RUN: 'true',
        RELEASE_TRACKING: 'true',
        RELEASE_TRACKING_LABELS: 'pending',
      });
      expect(result.exitCode).toBe(0);

      await sleep(WAIT_FOR_ISSUES_MS);

      const issues = await getCreatedIssues(
        s.octokit,
        s.upstreamRepo,
        startTime,
        shas,
      );
      expect(issues.length).toBe(1);

      const issue = issues[0];
      s.cleanup.issues.push({
        owner: s.upstreamRepo.owner,
        repo: s.upstreamRepo.repo,
        number: issue.number,
      });

      // Fetch fresh issue data to verify labels
      const freshIssue = await s.octokit.issues.get({
        owner: s.upstreamRepo.owner,
        repo: s.upstreamRepo.repo,
        issue_number: issue.number,
      });

      const labels = freshIssue.data.labels.map(l =>
        typeof l === 'string' ? l : l.name,
      );

      expect(labels).toContain('pending');
      if (s.env.labels) {
        const expectedLabels = parseLabels(s.env.labels);
        expectLabels(freshIssue.data, expectedLabels);
      }
    });
  });

  it('should remove pending label when commit is released', async () => {
    await withBranch(s, async ({ baseSha, branch }) => {
      const shas = await makeCommits(s, branch, 1);
      const commitSha = shas[0];
      const startTime = new Date();

      // Create issue first (without release)
      await runAction({
        ACCESS_TOKEN: s.env.accessToken,
        HEAD_REPO: s.env.headRepoUrl,
        HEAD_REPO_BRANCH: branch,
        UPSTREAM_REPO: s.env.upstreamRepoUrl,
        TRACK_FROM: baseSha,
        MAYBE_FIRST_RUN: 'true',
        RELEASE_TRACKING: 'true',
        RELEASE_TRACKING_LABELS: 'pending',
      });

      await sleep(WAIT_FOR_ISSUES_MS);

      const issuesBeforeRelease = await getCreatedIssues(
        s.octokit,
        s.upstreamRepo,
        startTime,
        shas,
      );
      expect(issuesBeforeRelease.length).toBe(1);

      const issue = issuesBeforeRelease[0];
      s.cleanup.issues.push({
        owner: s.upstreamRepo.owner,
        repo: s.upstreamRepo.repo,
        number: issue.number,
      });

      // Verify pending label exists
      const issueBeforeRelease = await s.octokit.issues.get({
        owner: s.upstreamRepo.owner,
        repo: s.upstreamRepo.repo,
        issue_number: issue.number,
      });
      const labelsBeforeRelease = issueBeforeRelease.data.labels.map(l =>
        typeof l === 'string' ? l : l.name,
      );
      expect(labelsBeforeRelease).toContain('pending');

      // Create actual release tag (not pre-release)
      const releaseTag = '2.0.0'; // Must be actual release for pending label removal
      await createTag(s.octokit, s.headRepo, releaseTag, commitSha);
      s.cleanup.tags.push({
        owner: s.headRepo.owner,
        repo: s.headRepo.repo,
        name: releaseTag,
      });

      await sleep(WAIT_FOR_ISSUES_MS);

      // Run again after tagging (released state)
      await runAction({
        ACCESS_TOKEN: s.env.accessToken,
        HEAD_REPO: s.env.headRepoUrl,
        HEAD_REPO_BRANCH: branch,
        UPSTREAM_REPO: s.env.upstreamRepoUrl,
        TRACK_FROM: baseSha,
        MAYBE_FIRST_RUN: 'true',
        RELEASE_TRACKING: 'true',
        RELEASE_TRACKING_LABELS: 'pending',
      });

      await sleep(WAIT_FOR_ISSUES_MS);

      // Verify pending label removed
      const issueAfterRelease = await s.octokit.issues.get({
        owner: s.upstreamRepo.owner,
        repo: s.upstreamRepo.repo,
        issue_number: issue.number,
      });

      const labelsAfterRelease = issueAfterRelease.data.labels.map(l =>
        typeof l === 'string' ? l : l.name,
      );

      expect(labelsAfterRelease).not.toContain('pending');
      if (s.env.labels) {
        const expectedLabels = parseLabels(s.env.labels);
        expectLabels(issueAfterRelease.data, expectedLabels);
      }
    });
  });
});
