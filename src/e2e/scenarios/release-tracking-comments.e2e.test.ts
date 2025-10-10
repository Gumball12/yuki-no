import { cleanup, makeCommits, setup, withBranch } from '../helpers/fixture';
import {
  createTag,
  generateE2EPrereleaseTag,
  getCreatedIssues,
} from '../helpers/github';
import { runAction } from '../helpers/spawn';
import { sleep } from '../helpers/utils';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let s: Awaited<ReturnType<typeof setup>>;

const WAIT_FOR_ISSUES_MS = 5000;

describe('E2E: Release Tracking - Comments', () => {
  beforeAll(async () => {
    s = await setup();
  });

  afterAll(async () => {
    await cleanup(s);
  });

  it('should add comment when no release exists', async () => {
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

      // Verify comment exists
      const { data: comments } = await s.octokit.issues.listComments({
        owner: s.upstreamRepo.owner,
        repo: s.upstreamRepo.repo,
        issue_number: issue.number,
      });

      expect(comments.length).toBeGreaterThan(0);
      const commentNoRelease = comments[comments.length - 1];

      expect(commentNoRelease.body).toContain('pre-release: none');
      expect(commentNoRelease.body).toContain('release: none');
      // Note: release-tracking explanation only appears when hasAnyRelease returns false
    });
  });

  it('should add comment with pre-release and release info', async () => {
    await withBranch(s, async ({ baseSha, branch }) => {
      const shas = await makeCommits(s, branch, 1);
      const commitSha = shas[0];
      const startTime = new Date();

      // Step 1: Create issue without release
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

      // Step 2: Add pre-release tag
      const prereleaseTag = generateE2EPrereleaseTag('4.0.0');
      await createTag(s.octokit, s.headRepo, prereleaseTag, commitSha);
      s.cleanup.tags.push({
        owner: s.headRepo.owner,
        repo: s.headRepo.repo,
        name: prereleaseTag,
      });

      await sleep(WAIT_FOR_ISSUES_MS);

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

      let { data: comments } = await s.octokit.issues.listComments({
        owner: s.upstreamRepo.owner,
        repo: s.upstreamRepo.repo,
        issue_number: issue.number,
      });

      const commentWithPrerelease = comments[comments.length - 1];

      expect(commentWithPrerelease.body).toContain(
        `pre-release: [${prereleaseTag}]`,
      );
      expect(commentWithPrerelease.body).toContain(
        `/releases/tag/${prereleaseTag}`,
      );
      expect(commentWithPrerelease.body).toContain('release: none');

      // Step 3: Add full release tag
      const releaseTag = '4.0.0';
      await createTag(s.octokit, s.headRepo, releaseTag, commitSha);
      s.cleanup.tags.push({
        owner: s.headRepo.owner,
        repo: s.headRepo.repo,
        name: releaseTag,
      });

      await sleep(WAIT_FOR_ISSUES_MS);

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

      ({ data: comments } = await s.octokit.issues.listComments({
        owner: s.upstreamRepo.owner,
        repo: s.upstreamRepo.repo,
        issue_number: issue.number,
      }));

      const commentWithRelease = comments[comments.length - 1];

      expect(commentWithRelease.body).toContain(
        `pre-release: [${prereleaseTag}]`,
      );
      expect(commentWithRelease.body).toContain(
        `/releases/tag/${prereleaseTag}`,
      );
      expect(commentWithRelease.body).toContain(`release: [${releaseTag}]`);
      expect(commentWithRelease.body).toContain(`/releases/tag/${releaseTag}`);
    });
  });

  it('should not create duplicate comments on re-run', async () => {
    await withBranch(s, async ({ baseSha, branch }) => {
      const shas = await makeCommits(s, branch, 1);
      const commitSha = shas[0];
      const startTime = new Date();

      // Create issue and add release
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

      // Add both pre-release and release tags
      const prereleaseTag = generateE2EPrereleaseTag('5.0.0');
      const releaseTag = '5.0.0';

      await createTag(s.octokit, s.headRepo, prereleaseTag, commitSha);
      s.cleanup.tags.push({
        owner: s.headRepo.owner,
        repo: s.headRepo.repo,
        name: prereleaseTag,
      });

      await createTag(s.octokit, s.headRepo, releaseTag, commitSha);
      s.cleanup.tags.push({
        owner: s.headRepo.owner,
        repo: s.headRepo.repo,
        name: releaseTag,
      });

      await sleep(WAIT_FOR_ISSUES_MS);

      // First run with release tags
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

      const { data: commentsBeforeRerun } = await s.octokit.issues.listComments(
        {
          owner: s.upstreamRepo.owner,
          repo: s.upstreamRepo.repo,
          issue_number: issue.number,
        },
      );

      const commentCountBefore = commentsBeforeRerun.length;

      // Re-run without any changes
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

      const { data: commentsAfterRerun } = await s.octokit.issues.listComments({
        owner: s.upstreamRepo.owner,
        repo: s.upstreamRepo.repo,
        issue_number: issue.number,
      });

      const commentCountAfter = commentsAfterRerun.length;

      // No new comment should be added
      expect(commentCountAfter).toBe(commentCountBefore);
    });
  });
});
