import { getTrackedIssues } from '../utils/getTrackedIssues';

import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { Issue } from '@yuki-no/plugin-sdk/types/github';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('getTrackedIssues', () => {
  let mockGitHub: GitHub;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGitHub = {
      api: {
        pulls: {
          get: vi.fn(),
        },
      },
      ownerAndRepo: {
        owner: 'test-owner',
        repo: 'test-repo',
      },
    } as any;
  });

  describe('when PR has tracked issues', () => {
    test('should correctly classify tracked and not tracked issues', async () => {
      // Given
      const prNumber = 123;
      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: [],
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 2,
          body: 'Issue 2 body',
          labels: [],
          hash: 'hash2',
          isoDate: '2023-01-02T00:00:00Z',
        },
        {
          number: 3,
          body: 'Issue 3 body',
          labels: [],
          hash: 'hash3',
          isoDate: '2023-01-03T00:00:00Z',
        },
      ];
      const prBody = `
        ## Summary
        This PR resolves some issues.
        
        Resolved #1
        Resolved #2
        
        Some other content.
      `;

      (mockGitHub.api.pulls.get as any).mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getTrackedIssues(mockGitHub, prNumber, mockIssues);

      // Then
      expect(result.trackedIssues).toHaveLength(2);
      expect(result.trackedIssues[0].number).toBe(1);
      expect(result.trackedIssues[1].number).toBe(2);
      expect(result.shouldTrackIssues).toHaveLength(1);
      expect(result.shouldTrackIssues[0].number).toBe(3);
    });

    test('should handle multiple Resolved patterns correctly', async () => {
      // Given
      const prNumber = 456;
      const mockIssues: Issue[] = [
        {
          number: 10,
          body: 'Issue 10 body',
          labels: [],
          hash: 'hash10',
          isoDate: '2023-01-10T00:00:00Z',
        },
        {
          number: 20,
          body: 'Issue 20 body',
          labels: [],
          hash: 'hash20',
          isoDate: '2023-01-20T00:00:00Z',
        },
        {
          number: 30,
          body: 'Issue 30 body',
          labels: [],
          hash: 'hash30',
          isoDate: '2023-01-30T00:00:00Z',
        },
      ];
      const prBody = `
        Resolved #10
        Some text
        Resolved #20
        Resolved #30
      `;

      (mockGitHub.api.pulls.get as any).mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getTrackedIssues(mockGitHub, prNumber, mockIssues);

      // Then
      expect(result.trackedIssues).toHaveLength(3);
      expect(result.trackedIssues.map(i => i.number)).toEqual([10, 20, 30]);
      expect(result.shouldTrackIssues).toHaveLength(0);
    });

    test('should handle tracked issue numbers that are not in opened issues', async () => {
      // Given
      const prNumber = 789;
      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: [],
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 2,
          body: 'Issue 2 body',
          labels: [],
          hash: 'hash2',
          isoDate: '2023-01-02T00:00:00Z',
        },
      ];
      const prBody = `
        Resolved #1
        Resolved #999
      `;

      (mockGitHub.api.pulls.get as any).mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getTrackedIssues(mockGitHub, prNumber, mockIssues);

      // Then
      expect(result.trackedIssues).toHaveLength(1);
      expect(result.trackedIssues[0].number).toBe(1);
      expect(result.shouldTrackIssues).toHaveLength(1);
      expect(result.shouldTrackIssues[0].number).toBe(2);
    });
  });

  describe('when PR has no tracked issues', () => {
    test('should return all issues as not tracked', async () => {
      // Given
      const prNumber = 321;
      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: [],
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 2,
          body: 'Issue 2 body',
          labels: [],
          hash: 'hash2',
          isoDate: '2023-01-02T00:00:00Z',
        },
      ];
      const prBody = `
        ## Summary
        This PR does not resolve any issues.
        Just some improvements.
      `;

      (mockGitHub.api.pulls.get as any).mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getTrackedIssues(mockGitHub, prNumber, mockIssues);

      // Then
      expect(result.trackedIssues).toHaveLength(0);
      expect(result.shouldTrackIssues).toHaveLength(2);
      expect(result.shouldTrackIssues.map(i => i.number)).toEqual([1, 2]);
    });
  });

  describe('when PR body is empty or missing', () => {
    test('should throw error when PR body is null', async () => {
      // Given
      const prNumber = 111;
      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: [],
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
      ];

      (mockGitHub.api.pulls.get as any).mockResolvedValue({
        data: { body: null },
      });

      // When & Then
      await expect(
        getTrackedIssues(mockGitHub, prNumber, mockIssues),
      ).rejects.toThrow(
        'PR #111 body is empty or missing. Cannot extract tracked issue numbers.',
      );
    });

    test('should throw error when PR body is empty string', async () => {
      // Given
      const prNumber = 222;
      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: [],
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
      ];

      (mockGitHub.api.pulls.get as any).mockResolvedValue({
        data: { body: '' },
      });

      // When & Then
      await expect(
        getTrackedIssues(mockGitHub, prNumber, mockIssues),
      ).rejects.toThrow(
        'PR #222 body is empty or missing. Cannot extract tracked issue numbers.',
      );
    });

    test('should throw error when PR body is undefined', async () => {
      // Given
      const prNumber = 333;
      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: [],
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
      ];

      (mockGitHub.api.pulls.get as any).mockResolvedValue({
        data: { body: undefined },
      });

      // When & Then
      await expect(
        getTrackedIssues(mockGitHub, prNumber, mockIssues),
      ).rejects.toThrow(
        'PR #333 body is empty or missing. Cannot extract tracked issue numbers.',
      );
    });
  });

  describe('when no opened issues exist', () => {
    test('should return empty arrays when no opened issues', async () => {
      // Given
      const prNumber = 444;
      const mockIssues: Issue[] = [];
      const prBody = `
        Resolved #1
        Resolved #2
      `;

      (mockGitHub.api.pulls.get as any).mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getTrackedIssues(mockGitHub, prNumber, mockIssues);

      // Then
      expect(result.trackedIssues).toHaveLength(0);
      expect(result.shouldTrackIssues).toHaveLength(0);
    });
  });

  describe('API calls', () => {
    test('should call GitHub API with correct parameters', async () => {
      // Given
      const prNumber = 555;
      const mockIssues: Issue[] = [];
      const prBody = 'Some PR body';

      (mockGitHub.api.pulls.get as any).mockResolvedValue({
        data: { body: prBody },
      });

      // When
      await getTrackedIssues(mockGitHub, prNumber, mockIssues);

      // Then
      expect(mockGitHub.api.pulls.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: prNumber,
      });
    });
  });

  describe('regex pattern matching', () => {
    test('should extract issue numbers correctly from various formats', async () => {
      // Given
      const prNumber = 666;
      const mockIssues: Issue[] = [
        {
          number: 123,
          body: 'Issue 123 body',
          labels: [],
          hash: 'hash123',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 456,
          body: 'Issue 456 body',
          labels: [],
          hash: 'hash456',
          isoDate: '2023-01-02T00:00:00Z',
        },
        {
          number: 789,
          body: 'Issue 789 body',
          labels: [],
          hash: 'hash789',
          isoDate: '2023-01-03T00:00:00Z',
        },
      ];
      const prBody = `
        Beginning of text Resolved #123 middle of text
        Resolved #456
        Some other text
        Resolved #789 end of text
        This should not match: resolve #999 (lowercase)
        This should not match: Resolved 888 (no #)
      `;

      (mockGitHub.api.pulls.get as any).mockResolvedValue({
        data: { body: prBody },
      });

      // When
      const result = await getTrackedIssues(mockGitHub, prNumber, mockIssues);

      // Then
      expect(result.trackedIssues).toHaveLength(3);
      expect(result.trackedIssues.map(i => i.number)).toEqual([123, 456, 789]);
      expect(result.shouldTrackIssues).toHaveLength(0);
    });
  });
});
