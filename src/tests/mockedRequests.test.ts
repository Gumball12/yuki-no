import { Octokit } from '@octokit/rest';
import { describe, expect, it } from 'vitest';

const TEST_REPO = {
  owner: 'Gumball12',
  repo: 'yuki-no',
};
const TEST_ISSUE_NUM = 1;

const isCI = process.env.CI === 'true';
const currRepo = process.env.GITHUB_REPOSITORY || '';
const ALLOWED_REPO = `${TEST_REPO.owner}/${TEST_REPO.repo}`;
const shouldRunTests = isCI && currRepo === ALLOWED_REPO;

describe('GitHub API Integration Tests', () => {
  if (!shouldRunTests) {
    it.skip('Skipping tests - not in CI environment or not in allowed repository', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  describe('Issues API', () => {
    it('Should list repository issues with the expected structure', async () => {
      const { data } = await octokit.issues.listForRepo({
        ...TEST_REPO,
        state: 'open',
        per_page: 1,
      });

      expect(Array.isArray(data)).toBe(true);

      if (data.length > 0) {
        expect(data[0]).toMatchObject({
          number: expect.any(Number),
          title: expect.any(String),
          body: expect.any(String),
          labels: expect.any(Array),
        });
      }
    });

    it('Should create and list issue comments with the expected structure', async () => {
      const commentBody = 'Test Comment';
      const { data: createdComment } = await octokit.issues.createComment({
        ...TEST_REPO,
        issue_number: TEST_ISSUE_NUM,
        body: commentBody,
      });

      expect(createdComment).toMatchObject({
        id: expect.any(Number),
        body: commentBody,
        user: expect.any(Object),
      });

      const { data: comments } = await octokit.issues.listComments({
        ...TEST_REPO,
        issue_number: TEST_ISSUE_NUM,
      });

      expect(Array.isArray(comments)).toBe(true);
      expect(comments).toContainEqual(
        expect.objectContaining({
          id: createdComment.id,
          body: commentBody,
        }),
      );
    });

    it('Should set and get issue labels with the expected structure', async () => {
      const labels = ['test-label'];
      const { data: updatedLabels } = await octokit.issues.setLabels({
        ...TEST_REPO,
        issue_number: TEST_ISSUE_NUM,
        labels,
      });

      expect(Array.isArray(updatedLabels)).toBe(true);
      expect(updatedLabels).toEqual(
        expect.arrayContaining(
          labels.map(label => expect.objectContaining({ name: label })),
        ),
      );
    });
  });

  describe('Search API', () => {
    it('Should search issues with the expected structure', async () => {
      const { data } = await octokit.search.issuesAndPullRequests({
        q: `repo:${TEST_REPO.owner}/${TEST_REPO.repo} type:issue`,
        per_page: 1,
      });

      expect(data).toMatchObject({
        total_count: expect.any(Number),
        items: expect.any(Array),
      });

      if (data.items.length > 0) {
        expect(data.items[0]).toMatchObject({
          number: expect.any(Number),
          title: expect.any(String),
          body: expect.any(String),
          labels: expect.any(Array),
        });
      }
    });
  });

  describe('Actions API', () => {
    it('Should list workflow runs with the expected structure', async () => {
      const { data } = await octokit.actions.listWorkflowRunsForRepo({
        ...TEST_REPO,
        status: 'success',
        per_page: 1,
      });

      expect(data).toMatchObject({
        total_count: expect.any(Number),
        workflow_runs: expect.any(Array),
      });

      if (data.workflow_runs.length > 0) {
        expect(data.workflow_runs[0]).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          status: expect.any(String),
          created_at: expect.any(String),
        });
      }
    });
  });
});
