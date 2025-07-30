import { setupBatchPr } from '../../utils/setupBatchPr';

import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('../../utils/createCommit');
vi.mock('../../utils/createPrBody');

const { createCommit } = await import('../../utils/createCommit');
const { createPrBody } = await import('../../utils/createPrBody');
const mockCreateCommit = vi.mocked(createCommit);
const mockCreatePrBody = vi.mocked(createPrBody);

describe('setupBatchPr', () => {
  let mockGitHub: GitHub;
  let mockGit: Git;
  const testBranchName = 'test-batch-branch';
  const expectedPrTitle = `❄️ Translation Batch`;
  const expectedPrLabel = '__translation-batch';

  beforeEach(() => {
    vi.clearAllMocks();

    mockGitHub = {
      api: {
        search: {
          issuesAndPullRequests: vi.fn(),
        },
        pulls: {
          create: vi.fn(),
        },
        issues: {
          setLabels: vi.fn(),
        },
      },
      ownerAndRepo: {
        owner: 'test-owner',
        repo: 'test-repo',
      },
    } as any;

    mockGit = {
      exec: vi.fn(),
    } as any;

    mockCreatePrBody.mockReturnValue('Test PR body');
  });

  describe('when existing PR is found', () => {
    test('should checkout to existing branch and return existing PR info', async () => {
      // Given
      const existingPr = {
        number: 123,
        title: expectedPrTitle,
      };

      (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
        data: {
          items: [existingPr],
        },
      });

      // When
      const result = await setupBatchPr(mockGitHub, mockGit, testBranchName);

      // Then
      expect(result).toEqual({
        prNumber: 123,
      });

      expect(mockGitHub.api.search.issuesAndPullRequests).toHaveBeenCalledWith({
        q: `repo:test-owner/test-repo is:pr is:open label:${expectedPrLabel} in:title ${expectedPrTitle}`,
        advanced_search: 'true',
      });

      expect(mockGit.exec).toHaveBeenCalledWith(`checkout ${testBranchName}`);
      expect(mockGit.exec).toHaveBeenCalledTimes(1);

      // Should not create new PR
      expect(mockGitHub.api.pulls.create).not.toHaveBeenCalled();
      expect(mockCreateCommit).not.toHaveBeenCalled();
    });
  });

  describe('when no existing PR is found', () => {
    test('should create new branch, commit, push, and create PR', async () => {
      // Given
      (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
        data: {
          items: [],
        },
      });

      const createdPr = {
        number: 456,
        title: expectedPrTitle,
      };

      (mockGitHub.api.pulls.create as any).mockResolvedValue({
        data: createdPr,
      });

      // When
      const result = await setupBatchPr(mockGitHub, mockGit, testBranchName);

      // Then
      expect(result).toEqual({
        prNumber: 456,
      });

      expect(mockGit.exec).toHaveBeenNthCalledWith(
        1,
        `checkout -B ${testBranchName}`,
      );
      expect(mockCreateCommit).toHaveBeenCalledWith(mockGit, {
        message: 'Initial translation batch commit',
        allowEmpty: true,
      });
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        `push -f origin ${testBranchName}`,
      );

      expect(mockGitHub.api.pulls.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        title: `${expectedPrTitle} - ${new Date().toISOString().split('T')[0]}`,
        body: 'Test PR body',
        head: testBranchName,
        base: 'main',
      });

      expect(mockGitHub.api.issues.setLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 456,
        labels: [expectedPrLabel],
      });
    });

    test('should call createPrBody with empty array', async () => {
      // Given
      (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
        data: {
          items: [],
        },
      });

      (mockGitHub.api.pulls.create as any).mockResolvedValue({
        data: { number: 789 },
      });

      // When
      await setupBatchPr(mockGitHub, mockGit, testBranchName);

      // Then
      expect(mockCreatePrBody).toHaveBeenCalledWith([]);
    });
  });

  describe('PR creation with different bases', () => {
    test('should use default base branch "main" when creating PR', async () => {
      // Given
      (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
        data: { items: [] },
      });

      (mockGitHub.api.pulls.create as any).mockResolvedValue({
        data: { number: 999 },
      });

      // When
      await setupBatchPr(mockGitHub, mockGit, testBranchName);

      // Then
      expect(mockGitHub.api.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          base: 'main',
        }),
      );
    });
  });

  describe('search query construction', () => {
    test('should construct correct search query', async () => {
      // Given
      (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
        data: { items: [] },
      });

      (mockGitHub.api.pulls.create as any).mockResolvedValue({
        data: { number: 111 },
      });

      // When
      await setupBatchPr(mockGitHub, mockGit, testBranchName);

      // Then
      const expectedQuery = `repo:test-owner/test-repo is:pr is:open label:${expectedPrLabel} in:title ${expectedPrTitle}`;
      expect(mockGitHub.api.search.issuesAndPullRequests).toHaveBeenCalledWith({
        q: expectedQuery,
        advanced_search: 'true',
      });
    });
  });

  describe('label assignment', () => {
    test('should set labels after PR creation', async () => {
      // Given
      (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
        data: { items: [] },
      });

      const prNumber = 222;
      (mockGitHub.api.pulls.create as any).mockResolvedValue({
        data: { number: prNumber },
      });

      // When
      await setupBatchPr(mockGitHub, mockGit, testBranchName);

      // Then
      expect(mockGitHub.api.issues.setLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: prNumber,
        labels: [expectedPrLabel],
      });
    });
  });

  describe('git operations sequence', () => {
    test('should execute git commands in correct order for new PR', async () => {
      // Given
      (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
        data: { items: [] },
      });

      (mockGitHub.api.pulls.create as any).mockResolvedValue({
        data: { number: 333 },
      });

      // When
      await setupBatchPr(mockGitHub, mockGit, testBranchName);

      // Then
      expect(mockGit.exec).toHaveBeenCalledTimes(2);
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        1,
        `checkout -B ${testBranchName}`,
      );
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        `push -f origin ${testBranchName}`,
      );
    });
  });

  describe('date formatting in PR title', () => {
    test('should format date correctly in PR title', async () => {
      // Given
      (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
        data: { items: [] },
      });

      (mockGitHub.api.pulls.create as any).mockResolvedValue({
        data: { number: 444 },
      });

      // When
      await setupBatchPr(mockGitHub, mockGit, testBranchName);

      // Then
      expect(mockGitHub.api.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: `${expectedPrTitle} - ${new Date().toISOString().split('T')[0]}`,
        }),
      );
    });
  });

  describe('error handling', () => {
    test('should handle search API errors', async () => {
      // Given
      const searchError = new Error('Search API failed');
      (mockGitHub.api.search.issuesAndPullRequests as any).mockRejectedValue(
        searchError,
      );

      // When & Then
      await expect(
        setupBatchPr(mockGitHub, mockGit, testBranchName),
      ).rejects.toThrow('Search API failed');
    });

    test('should handle PR creation errors', async () => {
      // Given
      (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
        data: { items: [] },
      });

      const createError = new Error('PR creation failed');
      (mockGitHub.api.pulls.create as any).mockRejectedValue(createError);

      // When & Then
      await expect(
        setupBatchPr(mockGitHub, mockGit, testBranchName),
      ).rejects.toThrow('PR creation failed');
    });
  });
});
