import { GitHub } from '../../../github/core';
import { getOpenedIssues } from '../../../github/getOpenedIssues';
import { getNotTrackedIssues } from '../../../plugins/ai-translation/getNotTrackedIssues';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../github/core', () => ({
  GitHub: vi.fn(),
}));

vi.mock('../../../github/getOpenedIssues', () => ({
  getOpenedIssues: vi.fn(),
}));

const createMockGitHub = () => {
  const mockApi = {
    pulls: {
      get: vi.fn(),
    },
  };
  const mockOwnerAndRepo = { owner: 'test-owner', repo: 'test-repo' };

  return {
    api: mockApi,
    ownerAndRepo: mockOwnerAndRepo,
    mockApi,
  };
};

const mockedGetOpenedIssues = vi.mocked(getOpenedIssues);

describe('getNotTrackedIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when PR exists and has issues to track', () => {
    it('should return not tracked issues when some issues are not in PR body', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const prNumber = 123;

      const openedIssues = [
        {
          number: 1,
          hash: 'hash1',
          body: 'issue body 1',
          labels: [],
          isoDate: '2023-01-01',
        },
        {
          number: 2,
          hash: 'hash2',
          body: 'issue body 2',
          labels: [],
          isoDate: '2023-01-02',
        },
        {
          number: 3,
          hash: 'hash3',
          body: 'issue body 3',
          labels: [],
          isoDate: '2023-01-03',
        },
        {
          number: 4,
          hash: 'hash4',
          body: 'issue body 4',
          labels: [],
          isoDate: '2023-01-04',
        },
      ];

      const prBody = `
## 🤖 AI Translation Batch

### Pending Issues
Pending #2

### Resolved Issues
Resolved #3

### ⚠️ Important Notice
**DO NOT EDIT THIS PR MANUALLY**
`;

      mockedGetOpenedIssues.mockResolvedValue(openedIssues);
      mockGitHub.mockApi.pulls.get.mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getNotTrackedIssues(
        mockGitHub as unknown as GitHub,
        prNumber,
      );

      // Then
      expect(result.notTrackedIssues).toEqual([
        {
          number: 1,
          hash: 'hash1',
          body: 'issue body 1',
          labels: [],
          isoDate: '2023-01-01',
        },
        {
          number: 4,
          hash: 'hash4',
          body: 'issue body 4',
          labels: [],
          isoDate: '2023-01-04',
        },
      ]);
      expect(result.hasPendingIssues).toBe(true);
      expect(mockGitHub.mockApi.pulls.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: prNumber,
      });
    });

    it('should return all issues as not tracked when PR body has no tracked issues', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const prNumber = 456;

      const openedIssues = [
        {
          number: 10,
          hash: 'hash10',
          body: 'issue body 10',
          labels: [],
          isoDate: '2023-01-10',
        },
        {
          number: 20,
          hash: 'hash20',
          body: 'issue body 20',
          labels: [],
          isoDate: '2023-01-20',
        },
      ];

      const prBody = `
## 🤖 AI Translation Batch

### Pending Issues

### Resolved Issues

### ⚠️ Important Notice
**DO NOT EDIT THIS PR MANUALLY**
`;

      mockedGetOpenedIssues.mockResolvedValue(openedIssues);
      mockGitHub.mockApi.pulls.get.mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getNotTrackedIssues(
        mockGitHub as unknown as GitHub,
        prNumber,
      );

      // Then
      expect(result.notTrackedIssues).toEqual(openedIssues);
      expect(result.hasPendingIssues).toBe(false);
    });

    it('should return empty not tracked issues when all issues are tracked', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const prNumber = 789;

      const openedIssues = [
        {
          number: 100,
          hash: 'hash100',
          body: 'issue body 100',
          labels: [],
          isoDate: '2023-01-01',
        },
        {
          number: 200,
          hash: 'hash200',
          body: 'issue body 200',
          labels: [],
          isoDate: '2023-01-02',
        },
      ];

      const prBody = `
## 🤖 AI Translation Batch

### Pending Issues
Pending #100

### Resolved Issues
Resolved #200

### ⚠️ Important Notice
**DO NOT EDIT THIS PR MANUALLY**
`;

      mockedGetOpenedIssues.mockResolvedValue(openedIssues);
      mockGitHub.mockApi.pulls.get.mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getNotTrackedIssues(
        mockGitHub as unknown as GitHub,
        prNumber,
      );

      // Then
      expect(result.notTrackedIssues).toEqual([]);
      expect(result.hasPendingIssues).toBe(true);
    });
  });

  describe('when PR body has multiple issues of same type', () => {
    it('should handle multiple pending issues correctly', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const prNumber = 111;

      const openedIssues = [
        {
          number: 1,
          hash: 'hash1',
          body: 'issue body 1',
          labels: [],
          isoDate: '2023-01-01',
        },
        {
          number: 2,
          hash: 'hash2',
          body: 'issue body 2',
          labels: [],
          isoDate: '2023-01-02',
        },
        {
          number: 3,
          hash: 'hash3',
          body: 'issue body 3',
          labels: [],
          isoDate: '2023-01-03',
        },
        {
          number: 4,
          hash: 'hash4',
          body: 'issue body 4',
          labels: [],
          isoDate: '2023-01-04',
        },
      ];

      const prBody = `
## 🤖 AI Translation Batch

### Pending Issues
Pending #1
Pending #2
Pending #3

### Resolved Issues

### ⚠️ Important Notice
**DO NOT EDIT THIS PR MANUALLY**
`;

      mockedGetOpenedIssues.mockResolvedValue(openedIssues);
      mockGitHub.mockApi.pulls.get.mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getNotTrackedIssues(
        mockGitHub as unknown as GitHub,
        prNumber,
      );

      // Then
      expect(result.notTrackedIssues).toEqual([
        {
          number: 4,
          hash: 'hash4',
          body: 'issue body 4',
          labels: [],
          isoDate: '2023-01-04',
        },
      ]);
      expect(result.hasPendingIssues).toBe(true);
    });

    it('should handle mixed pending and resolved issues', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const prNumber = 333;

      const openedIssues = [
        {
          number: 5,
          hash: 'hash5',
          body: 'issue body 5',
          labels: [],
          isoDate: '2023-01-05',
        },
        {
          number: 6,
          hash: 'hash6',
          body: 'issue body 6',
          labels: [],
          isoDate: '2023-01-06',
        },
        {
          number: 7,
          hash: 'hash7',
          body: 'issue body 7',
          labels: [],
          isoDate: '2023-01-07',
        },
        {
          number: 8,
          hash: 'hash8',
          body: 'issue body 8',
          labels: [],
          isoDate: '2023-01-08',
        },
        {
          number: 9,
          hash: 'hash9',
          body: 'issue body 9',
          labels: [],
          isoDate: '2023-01-09',
        },
      ];

      const prBody = `
## 🤖 AI Translation Batch

### Pending Issues
Pending #5
Pending #7

### Resolved Issues
Resolved #6
Resolved #9

### ⚠️ Important Notice
**DO NOT EDIT THIS PR MANUALLY**
`;

      mockedGetOpenedIssues.mockResolvedValue(openedIssues);
      mockGitHub.mockApi.pulls.get.mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getNotTrackedIssues(
        mockGitHub as unknown as GitHub,
        prNumber,
      );

      // Then
      expect(result.notTrackedIssues).toEqual([
        {
          number: 8,
          hash: 'hash8',
          body: 'issue body 8',
          labels: [],
          isoDate: '2023-01-08',
        },
      ]);
      expect(result.hasPendingIssues).toBe(true);
    });
  });

  describe('when PR body is empty or invalid', () => {
    it('should throw error when PR body is null', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const prNumber = 444;

      const openedIssues = [
        {
          number: 1,
          hash: 'hash1',
          body: 'issue body 1',
          labels: [],
          isoDate: '2023-01-01',
        },
      ];

      mockedGetOpenedIssues.mockResolvedValue(openedIssues);
      mockGitHub.mockApi.pulls.get.mockResolvedValue({
        data: { body: null },
      });

      // When & Then
      await expect(
        getNotTrackedIssues(mockGitHub as unknown as GitHub, prNumber),
      ).rejects.toThrow('');
    });

    it('should throw error when PR body is empty string', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const prNumber = 555;

      const openedIssues = [
        {
          number: 1,
          hash: 'hash1',
          body: 'issue body 1',
          labels: [],
          isoDate: '2023-01-01',
        },
      ];

      mockedGetOpenedIssues.mockResolvedValue(openedIssues);
      mockGitHub.mockApi.pulls.get.mockResolvedValue({
        data: { body: '' },
      });

      // When & Then
      await expect(
        getNotTrackedIssues(mockGitHub as unknown as GitHub, prNumber),
      ).rejects.toThrow('');
    });
  });

  describe('edge cases', () => {
    it('should handle issues with very large numbers', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const prNumber = 777;

      const openedIssues = [
        {
          number: 999999,
          hash: 'hash999999',
          body: 'issue body 999999',
          labels: [],
          isoDate: '2023-01-01',
        },
        {
          number: 1000000,
          hash: 'hash1000000',
          body: 'issue body 1000000',
          labels: [],
          isoDate: '2023-01-02',
        },
      ];

      const prBody = `
## 🤖 AI Translation Batch

### Pending Issues
Pending #999999

### Resolved Issues

### ⚠️ Important Notice
**DO NOT EDIT THIS PR MANUALLY**
`;

      mockedGetOpenedIssues.mockResolvedValue(openedIssues);
      mockGitHub.mockApi.pulls.get.mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getNotTrackedIssues(
        mockGitHub as unknown as GitHub,
        prNumber,
      );

      // Then
      expect(result.notTrackedIssues).toEqual([
        {
          number: 1000000,
          hash: 'hash1000000',
          body: 'issue body 1000000',
          labels: [],
          isoDate: '2023-01-02',
        },
      ]);
      expect(result.hasPendingIssues).toBe(true);
    });

    it('should handle empty opened issues list', async () => {
      // Given
      const mockGitHub = createMockGitHub();
      const prNumber = 999;

      const openedIssues: any[] = [];

      const prBody = `
## 🤖 AI Translation Batch

### Pending Issues
Pending #1

### Resolved Issues
Resolved #2

### ⚠️ Important Notice
**DO NOT EDIT THIS PR MANUALLY**
`;

      mockedGetOpenedIssues.mockResolvedValue(openedIssues);
      mockGitHub.mockApi.pulls.get.mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getNotTrackedIssues(
        mockGitHub as unknown as GitHub,
        prNumber,
      );

      // Then
      expect(result.notTrackedIssues).toEqual([]);
      expect(result.hasPendingIssues).toBe(true);
    });
  });
});
