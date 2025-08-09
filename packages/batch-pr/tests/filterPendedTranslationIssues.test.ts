import { filterPendedTranslationIssues } from '../utils/filterPendedTranslationIssues';

import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { Issue } from '@yuki-no/plugin-sdk/types/github';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('filterPendedTranslationIssues', () => {
  let mockGitHub: GitHub;
  let mockGetReleaseTrackingLabels: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Create a mock function for getReleaseTrackingLabels
    mockGetReleaseTrackingLabels = vi.fn();

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

  describe('when plugin-release-tracking is available', () => {
    test('should filter out issues with release tracking labels', async () => {
      // Given - mock the dynamic import to return our mock function
      vi.doMock(
        '@yuki-no/plugin-release-tracking/getReleaseTrackingLabels',
        () => ({
          getReleaseTrackingLabels: mockGetReleaseTrackingLabels,
        }),
      );

      // Setup release tracking labels
      mockGetReleaseTrackingLabels.mockResolvedValue(['v1.2.0', 'v1.3.0']);

      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: ['bug', 'feature'], // No release tracking labels - should pass
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 2,
          body: 'Issue 2 body',
          labels: ['v1.2.0', 'enhancement'], // Has v1.2.0 - should be filtered out
          hash: 'hash2',
          isoDate: '2023-01-02T00:00:00Z',
        },
        {
          number: 3,
          body: 'Issue 3 body',
          labels: ['documentation'], // No release tracking labels - should pass
          hash: 'hash3',
          isoDate: '2023-01-03T00:00:00Z',
        },
        {
          number: 4,
          body: 'Issue 4 body',
          labels: ['v1.3.0'], // Has v1.3.0 - should be filtered out
          hash: 'hash4',
          isoDate: '2023-01-04T00:00:00Z',
        },
      ];

      // When
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then - only issues without release tracking labels should remain
      expect(result).toHaveLength(2);
      expect(result.map(issue => issue.number)).toEqual([1, 3]);
      expect(mockGetReleaseTrackingLabels).toHaveBeenCalledWith(mockGitHub);
    });

    test('should return all issues when no issues have release tracking labels', async () => {
      // Given - mock the dynamic import
      vi.doMock(
        '@yuki-no/plugin-release-tracking/getReleaseTrackingLabels',
        () => ({
          getReleaseTrackingLabels: mockGetReleaseTrackingLabels,
        }),
      );

      // Setup release tracking labels
      mockGetReleaseTrackingLabels.mockResolvedValue(['v1.2.0', 'v1.3.0']);

      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: ['bug', 'feature'], // No release tracking labels
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 2,
          body: 'Issue 2 body',
          labels: ['enhancement', 'documentation'], // No release tracking labels
          hash: 'hash2',
          isoDate: '2023-01-02T00:00:00Z',
        },
      ];

      // When
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then - all issues should pass through
      expect(result).toHaveLength(2);
      expect(result.map(issue => issue.number)).toEqual([1, 2]);
      expect(mockGetReleaseTrackingLabels).toHaveBeenCalledWith(mockGitHub);
    });

    test('should filter out all issues when all have release tracking labels', async () => {
      // Given - mock the dynamic import
      vi.doMock(
        '@yuki-no/plugin-release-tracking/getReleaseTrackingLabels',
        () => ({
          getReleaseTrackingLabels: mockGetReleaseTrackingLabels,
        }),
      );

      // Setup release tracking labels
      mockGetReleaseTrackingLabels.mockResolvedValue(['v1.2.0', 'v1.3.0']);

      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: ['bug', 'v1.2.0'], // Has release tracking label
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 2,
          body: 'Issue 2 body',
          labels: ['v1.3.0', 'enhancement'], // Has release tracking label
          hash: 'hash2',
          isoDate: '2023-01-02T00:00:00Z',
        },
      ];

      // When
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then - no issues should pass through
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
      expect(mockGetReleaseTrackingLabels).toHaveBeenCalledWith(mockGitHub);
    });

    test('should handle empty release tracking labels', async () => {
      // Given - mock the dynamic import
      vi.doMock(
        '@yuki-no/plugin-release-tracking/getReleaseTrackingLabels',
        () => ({
          getReleaseTrackingLabels: mockGetReleaseTrackingLabels,
        }),
      );

      // No release tracking labels
      mockGetReleaseTrackingLabels.mockResolvedValue([]);

      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: ['v1.2.0', 'bug'],
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
      ];

      // When
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then - all issues should pass through since no labels to filter
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(1);
      expect(mockGetReleaseTrackingLabels).toHaveBeenCalledWith(mockGitHub);
    });
  });

  describe('when plugin-release-tracking is not available', () => {
    test('should return all issues when plugin cannot be imported', async () => {
      // Given - mock dynamic import to throw error (simulates import failure)
      vi.doMock(
        '@yuki-no/plugin-release-tracking/getReleaseTrackingLabels',
        () => {
          throw new Error('Module not found');
        },
      );

      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: ['bug', 'v1.2.0'], // Should pass through despite having potential release label
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 2,
          body: 'Issue 2 body',
          labels: ['enhancement'],
          hash: 'hash2',
          isoDate: '2023-01-02T00:00:00Z',
        },
      ];

      // When
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then - all issues should pass through when plugin is not available
      expect(result).toHaveLength(2);
      expect(result.map(issue => issue.number)).toEqual([1, 2]);
    });
  });

  describe('edge cases', () => {
    test('should handle empty issues array', async () => {
      // Given
      const mockIssues: Issue[] = [];

      // When
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    test('should handle issues with no labels', async () => {
      // Given
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

      // When
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then
      expect(result).toHaveLength(2);
      expect(result.map(issue => issue.number)).toEqual([1, 2]);
    });

    test('should handle issues with various label combinations', async () => {
      // Given
      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: ['bug'],
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 2,
          body: 'Issue 2 body',
          labels: ['enhancement', 'documentation'],
          hash: 'hash2',
          isoDate: '2023-01-02T00:00:00Z',
        },
      ];

      // When
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then
      expect(result).toHaveLength(2);
      expect(result.map(issue => issue.number)).toEqual([1, 2]);
    });
  });

  describe('function behavior verification', () => {
    test('should correctly apply filtering logic with mixed scenarios', async () => {
      // Given - mock the dynamic import
      vi.doMock(
        '@yuki-no/plugin-release-tracking/getReleaseTrackingLabels',
        () => ({
          getReleaseTrackingLabels: mockGetReleaseTrackingLabels,
        }),
      );

      // Setup release tracking labels
      mockGetReleaseTrackingLabels.mockResolvedValue(['v1.0.0', 'v2.0.0']);

      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: ['v1.0.0', 'bug'], // Should be filtered (has v1.0.0)
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 2,
          body: 'Issue 2 body',
          labels: ['feature', 'enhancement'], // Should pass (no release labels)
          hash: 'hash2',
          isoDate: '2023-01-02T00:00:00Z',
        },
        {
          number: 3,
          body: 'Issue 3 body',
          labels: ['documentation', 'v2.0.0'], // Should be filtered (has v2.0.0)
          hash: 'hash3',
          isoDate: '2023-01-03T00:00:00Z',
        },
      ];

      // When
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then - only issue 2 should pass through
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(2);
      expect(result[0].labels).toEqual(['feature', 'enhancement']);
      expect(mockGetReleaseTrackingLabels).toHaveBeenCalledWith(mockGitHub);
    });

    test('should preserve all issue properties when filtering', async () => {
      // Given - mock the dynamic import
      vi.doMock(
        '@yuki-no/plugin-release-tracking/getReleaseTrackingLabels',
        () => ({
          getReleaseTrackingLabels: mockGetReleaseTrackingLabels,
        }),
      );

      // Setup release tracking labels that won't match
      mockGetReleaseTrackingLabels.mockResolvedValue(['v1.0.0']);

      const mockIssues: Issue[] = [
        {
          number: 42,
          body: 'Test issue body content',
          labels: ['enhancement'], // No release tracking label
          hash: 'abc123',
          isoDate: '2023-12-01T10:30:00Z',
        },
      ];

      // When
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then - issue should pass through with all properties intact
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        number: 42,
        body: 'Test issue body content',
        labels: ['enhancement'],
        hash: 'abc123',
        isoDate: '2023-12-01T10:30:00Z',
      });
      expect(mockGetReleaseTrackingLabels).toHaveBeenCalledWith(mockGitHub);
    });
  });

  describe('error handling', () => {
    test('should handle errors gracefully when plugin execution fails', async () => {
      // Given - mock the dynamic import with a function that throws when called
      vi.doMock(
        '@yuki-no/plugin-release-tracking/getReleaseTrackingLabels',
        () => ({
          getReleaseTrackingLabels: vi.fn().mockImplementation(() => {
            throw new Error('Plugin execution failed');
          }),
        }),
      );

      const mockIssues: Issue[] = [
        {
          number: 1,
          body: 'Issue 1 body',
          labels: ['bug', 'v1.0.0'], // Should pass through despite potential release label
          hash: 'hash1',
          isoDate: '2023-01-01T00:00:00Z',
        },
        {
          number: 2,
          body: 'Issue 2 body',
          labels: ['enhancement'],
          hash: 'hash2',
          isoDate: '2023-01-02T00:00:00Z',
        },
      ];

      // When - function should not throw errors and handle gracefully
      const result = await filterPendedTranslationIssues(
        mockGitHub,
        mockIssues,
      );

      // Then - all issues should pass through when plugin fails (returns empty labels array)
      expect(result).toHaveLength(2);
      expect(result.map(issue => issue.number)).toEqual([1, 2]);
    });
  });
});
