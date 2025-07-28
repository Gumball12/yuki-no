import { Octokit } from '@octokit/rest';
import { describe, expect, it } from 'vitest';

const TEST_REPO = {
  owner: 'Gumball12',
  repo: 'yuki-no',
};
const TEST_ISSUE_NUM = 1;
const TEST_LABEL = 'test-label';

const isCI = process.env.CI === 'true';
const currRepo = process.env.GITHUB_REPOSITORY || '';
const ALLOWED_REPO = `${TEST_REPO.owner}/${TEST_REPO.repo}`;
const auth = process.env.MOCKED_REQUEST_TEST;
const shouldRunTests = isCI && currRepo === ALLOWED_REPO && auth;

describe('GitHub API Integration Tests', () => {
  if (!shouldRunTests) {
    it.skip('Skipping tests - not in CI environment or not in allowed repository', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const octokit = new Octokit({ auth });

  describe('Issues API', () => {
    it('Should list repository issues with the expected structure', async () => {
      const { data } = await octokit.issues.listForRepo({
        ...TEST_REPO,
        labels: TEST_LABEL,
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
        per_page: 10,
      });

      expect(Array.isArray(comments)).toBe(true);
      expect(comments).toContainEqual(
        expect.objectContaining({
          id: createdComment.id,
          body: commentBody,
        }),
      );

      await octokit.issues.deleteComment({
        ...TEST_REPO,
        comment_id: createdComment.id,
      });
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

    it('Should return created_at as valid ISO date string format in issues', async () => {
      const { data } = await octokit.issues.listForRepo({
        ...TEST_REPO,
        per_page: 1,
      });

      const [head] = data;

      if (head) {
        expect(head.created_at).toBeDefined();
        expect(isValidISODateString(head.created_at)).toBe(true);
      }
    });
  });

  describe('Search API', () => {
    it('Should search issues with the expected structure', async () => {
      // Using search.issuesAndPullRequests for testing GitHub's search functionality
      // This API is more efficient for finding specific issues based on content/metadata
      // rather than listing all issues and filtering client-side
      // Using advanced_search: 'true' to prepare for 2025-09-04 API changes
      const { data } = await octokit.search.issuesAndPullRequests({
        q: `repo:${TEST_REPO.owner}/${TEST_REPO.repo} type:issue`,
        per_page: 1,
        advanced_search: 'true',
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

    it('Should return created_at as valid ISO date string format in workflow runs', async () => {
      const { data } = await octokit.actions.listWorkflowRunsForRepo({
        ...TEST_REPO,
        status: 'success',
        per_page: 1,
      });

      const [head] = data.workflow_runs;

      if (head) {
        expect(head.created_at).toBeDefined();
        expect(isValidISODateString(head.created_at)).toBeTruthy();
      }
    });
  });

  describe('Date Format Verification', () => {
    it('Should verify all GitHub API date formats match ISO 8601 standard (seconds precision with Z)', async () => {
      const issuesResponse = await octokit.issues.listForRepo({
        ...TEST_REPO,
        per_page: 1,
      });

      const [issueHead] = issuesResponse.data;

      if (issueHead) {
        expect(isValidISODateString(issueHead.created_at)).toBe(true);
        expect(isValidISODateString(issueHead.updated_at)).toBe(true);
      }

      const workflowsResponse = await octokit.actions.listWorkflowRunsForRepo({
        ...TEST_REPO,
        per_page: 1,
      });

      const [workflowHead] = workflowsResponse.data.workflow_runs;

      if (workflowHead) {
        expect(isValidISODateString(workflowHead.created_at)).toBe(true);
        expect(isValidISODateString(workflowHead.updated_at)).toBe(true);
      }
    });
  });
});

const isValidISODateString = (dateString: string): boolean => {
  const isoFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  return isoFormat.test(dateString);
};
