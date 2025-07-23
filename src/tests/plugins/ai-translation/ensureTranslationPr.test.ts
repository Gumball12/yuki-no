import { Git } from '../../../git/core';
import { GitHub } from '../../../github/core';
import { setIssueLabels } from '../../../github/setIssueLabels';
import {
  ensureTranslationPr,
  pushBranch,
  updatePullRequest,
} from '../../../plugins/ai-translation/ensureTranslationPr';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../git/core', () => ({
  Git: vi.fn(),
}));

vi.mock('../../../github/core', () => ({
  GitHub: vi.fn(),
}));

vi.mock('../../../github/setIssueLabels', () => ({
  setIssueLabels: vi.fn(),
}));

const mockedSetIssueLabels = vi.mocked(setIssueLabels);

const createMockGitHub = () => {
  const mockApi = {
    search: {
      issuesAndPullRequests: vi.fn(),
    },
    pulls: {
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const mockOwnerAndRepo = { owner: 'test-owner', repo: 'test-repo' };

  return {
    api: mockApi,
    ownerAndRepo: mockOwnerAndRepo,
    mockApi,
  };
};

const createMockGit = () => ({
  exec: vi.fn(),
  repoSpec: { branch: 'main' },
  mockExec: vi.fn(),
});

describe('ensureTranslationPr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when existing PR found', () => {
    it('should return existing PR number when PR with label and title exists', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const mockGit = createMockGit();

      const existingPr = {
        number: 123,
        title: 'Existing AI Translation PR',
      };

      mockGitHub.mockApi.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [existingPr],
        },
      });

      // When
      const result = await ensureTranslationPr(
        mockGitHub as unknown as GitHub,
        mockGit as unknown as Git,
      );

      // Then
      expect(result.prNumber).toBe(123);
      expect(
        mockGitHub.mockApi.search.issuesAndPullRequests,
      ).toHaveBeenCalledWith({
        q: expect.stringMatching(
          /repo:test-owner\/test-repo is:pr is:open label:__ai-translated in:title 🤖 AI Translation Batch - \d{4}-\d{2}-\d{2}/,
        ),
        advanced_search: 'true',
      });
      expect(mockGit.exec).toHaveBeenCalledWith(
        'checkout __yuki-no-ai-translation',
      );
      expect(mockGitHub.mockApi.pulls.create).not.toHaveBeenCalled();
    });

    it('should return first PR when multiple PRs found', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const mockGit = createMockGit();

      const multiplePrs = [
        { number: 111, title: 'First PR' },
        { number: 222, title: 'Second PR' },
      ];

      mockGitHub.mockApi.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: multiplePrs,
        },
      });

      // When
      const result = await ensureTranslationPr(
        mockGitHub as unknown as GitHub,
        mockGit as unknown as Git,
      );

      // Then
      expect(result.prNumber).toBe(111);
    });
  });

  describe('pushBranch', () => {
    it('should push branch to origin by default', () => {
      // Given
      const mockGit = createMockGit();

      // When
      pushBranch({ git: mockGit as unknown as Git, branchName: 'test-branch' });

      // Then
      expect(mockGit.exec).toHaveBeenCalledWith('push  origin test-branch');
    });

    it('should push branch to specified remote', () => {
      // Given
      const mockGit = createMockGit();

      // When
      pushBranch({
        git: mockGit as unknown as Git,
        branchName: 'test-branch',
        remote: 'upstream',
      });

      // Then
      expect(mockGit.exec).toHaveBeenCalledWith('push  upstream test-branch');
    });
  });

  describe('updatePullRequest', () => {
    it('should update PR with body only', async () => {
      // Given
      const mockUpdatedPr = {
        id: 123,
        number: 1,
        title: 'Existing Title',
        body: 'Updated body content',
      };

      const mockGitHub = createMockGitHub();
      mockGitHub.mockApi.pulls.update.mockResolvedValue({
        data: mockUpdatedPr,
      });

      // When
      const result = await updatePullRequest(
        mockGitHub as unknown as GitHub,
        1,
        {
          body: 'Updated body content',
        },
      );

      // Then
      expect(mockGitHub.mockApi.pulls.update).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 1,
        body: 'Updated body content',
      });
      expect(result).toEqual(mockUpdatedPr);
    });

    it('should update PR with body and title', async () => {
      // Given
      const mockUpdatedPr = {
        id: 123,
        number: 1,
        title: 'New Title',
        body: 'Updated body content',
      };

      const mockGitHub = createMockGitHub();
      mockGitHub.mockApi.pulls.update.mockResolvedValue({
        data: mockUpdatedPr,
      });

      // When
      const result = await updatePullRequest(
        mockGitHub as unknown as GitHub,
        1,
        {
          body: 'Updated body content',
          title: 'New Title',
        },
      );

      // Then
      expect(mockGitHub.mockApi.pulls.update).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 1,
        body: 'Updated body content',
        title: 'New Title',
      });
      expect(result).toEqual(mockUpdatedPr);
    });

    it('should handle API errors gracefully', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const apiError = new Error('API Error');
      mockGitHub.mockApi.pulls.update.mockRejectedValue(apiError);

      // When & Then
      await expect(
        updatePullRequest(mockGitHub as unknown as GitHub, 1, {
          body: 'Updated body content',
        }),
      ).rejects.toThrow('API Error');
    });
  });

  describe('when no existing PR found', () => {
    it('should create new PR when no existing PR found', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const mockGit = createMockGit();

      mockGitHub.mockApi.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
        },
      });

      const createdPr = {
        number: 456,
        title: 'New AI Translation PR',
      };

      mockGitHub.mockApi.pulls.create.mockResolvedValue({
        data: createdPr,
      });

      mockedSetIssueLabels.mockResolvedValue([]);

      // When
      const result = await ensureTranslationPr(
        mockGitHub as unknown as GitHub,
        mockGit as unknown as Git,
      );

      // Then
      expect(result.prNumber).toBe(456);

      // Verify git commands were executed in correct order
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        1,
        'checkout -B __yuki-no-ai-translation origin/main',
      );
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit --allow-empty -m "Initial translation batch commit"',
      );
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        3,
        'push -f origin __yuki-no-ai-translation',
      );

      // Verify PR creation
      expect(mockGitHub.mockApi.pulls.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        title: expect.stringMatching(
          /🤖 AI Translation Batch - \d{4}-\d{2}-\d{2}/,
        ),
        body: expect.stringContaining('## 🤖 AI Translation Batch'),
        head: '__yuki-no-ai-translation',
        base: 'main',
      });

      // Verify labels were set
      expect(mockedSetIssueLabels).toHaveBeenCalledWith(mockGitHub, 456, [
        '__ai-translated',
      ]);
    });

    it('should create PR with correct date format in title', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const mockGit = createMockGit();

      mockGitHub.mockApi.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
        },
      });

      const createdPr = { number: 789 };
      mockGitHub.mockApi.pulls.create.mockResolvedValue({
        data: createdPr,
      });

      mockedSetIssueLabels.mockResolvedValue([]);

      const originalDate = Date;
      const mockDate = new Date('2023-12-25T10:30:00Z');
      global.Date = vi.fn(() => mockDate) as any;
      global.Date.now = originalDate.now;

      // When
      await ensureTranslationPr(
        mockGitHub as unknown as GitHub,
        mockGit as unknown as Git,
      );

      // Then
      expect(mockGitHub.mockApi.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('AI Translation Batch'),
          body: expect.stringContaining(
            'This PR contains automated translations generated by AI.',
          ),
        }),
      );

      // Cleanup
      global.Date = originalDate;
    });

    it('should create PR with empty issue status in body', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const mockGit = createMockGit();

      mockGitHub.mockApi.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
        },
      });

      const createdPr = { number: 999 };
      mockGitHub.mockApi.pulls.create.mockResolvedValue({
        data: createdPr,
      });

      mockedSetIssueLabels.mockResolvedValue([]);

      // When
      await ensureTranslationPr(
        mockGitHub as unknown as GitHub,
        mockGit as unknown as Git,
      );

      // Then
      const createCall = mockGitHub.mockApi.pulls.create.mock.calls[0][0];
      expect(createCall.body).toContain('### Pending Issues');
      expect(createCall.body).toContain('### Resolved Issues');
      expect(createCall.body).toContain('**DO NOT EDIT THIS PR MANUALLY**');
      expect(createCall.body).toContain(
        'Generated by [Yuki-no AI Translation Plugin]',
      );
    });
  });

  describe('git operations', () => {
    it('should use forced branch creation', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const mockGit = createMockGit();

      mockGitHub.mockApi.search.issuesAndPullRequests.mockResolvedValue({
        data: { items: [] },
      });

      mockGitHub.mockApi.pulls.create.mockResolvedValue({
        data: { number: 123 },
      });

      mockedSetIssueLabels.mockResolvedValue([]);

      // When
      await ensureTranslationPr(
        mockGitHub as unknown as GitHub,
        mockGit as unknown as Git,
      );

      // Then
      expect(mockGit.exec).toHaveBeenCalledWith(
        'checkout -B __yuki-no-ai-translation origin/main',
      );
    });

    it('should use correct branch name from git repoSpec', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const mockGit = createMockGit();
      mockGit.repoSpec.branch = 'development';

      mockGitHub.mockApi.search.issuesAndPullRequests.mockResolvedValue({
        data: { items: [] },
      });

      mockGitHub.mockApi.pulls.create.mockResolvedValue({
        data: { number: 123 },
      });

      mockedSetIssueLabels.mockResolvedValue([]);

      // When
      await ensureTranslationPr(
        mockGitHub as unknown as GitHub,
        mockGit as unknown as Git,
      );

      // Then
      expect(mockGit.exec).toHaveBeenCalledWith(
        'checkout -B __yuki-no-ai-translation origin/development',
      );
    });

    it('should create empty commit with correct message', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const mockGit = createMockGit();

      mockGitHub.mockApi.search.issuesAndPullRequests.mockResolvedValue({
        data: { items: [] },
      });

      mockGitHub.mockApi.pulls.create.mockResolvedValue({
        data: { number: 123 },
      });

      mockedSetIssueLabels.mockResolvedValue([]);

      // When
      await ensureTranslationPr(
        mockGitHub as unknown as GitHub,
        mockGit as unknown as Git,
      );

      // Then
      expect(mockGit.exec).toHaveBeenCalledWith(
        'commit --allow-empty -m "Initial translation batch commit"',
      );
    });

    it('should push branch to origin', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const mockGit = createMockGit();

      mockGitHub.mockApi.search.issuesAndPullRequests.mockResolvedValue({
        data: { items: [] },
      });

      mockGitHub.mockApi.pulls.create.mockResolvedValue({
        data: { number: 123 },
      });

      mockedSetIssueLabels.mockResolvedValue([]);

      // When
      await ensureTranslationPr(
        mockGitHub as unknown as GitHub,
        mockGit as unknown as Git,
      );

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        3,
        'push -f origin __yuki-no-ai-translation',
      );
    });
  });
});
