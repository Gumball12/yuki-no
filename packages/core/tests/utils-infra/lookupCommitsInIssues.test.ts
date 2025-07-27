import { GitHub } from '../../infra/github';
import type { Commit } from '../../types/git';
import {
  chunk,
  lookupCommitsInIssues,
} from '../../utils-infra/lookupCommitsInIssues';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIssuesAndPullRequests = vi.fn();

vi.mock('../../infra/github', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { search: { issuesAndPullRequests: mockIssuesAndPullRequests } },
    repoSpec: { owner: 'test-owner', name: 'test-repo' },
  })),
}));

const MOCK_CONFIG = {
  accessToken: 'test-token',
  labels: ['test-label'],
  repoSpec: {
    owner: 'test-owner',
    name: 'test-repo',
    branch: 'main',
  },
};

const mockGitHub = new GitHub(MOCK_CONFIG);

const createMockCommit = (len: number): Commit[] =>
  [...Array(len)].map((_, ind) => ({
    hash: `aaaa${ind}`.padEnd(7, '0'),
    title: `Commit ${ind}`,
    isoDate: '2023-01-01T00:00:00Z',
    fileNames: [`file1-${ind}.ts`, `file2-${ind}.ts`],
  }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('chunk function', () => {
  it('Should return single array when chunkSize >= data length', () => {
    const data = [1, 2, 3];
    const result = chunk(data, 5);

    expect(result).toEqual([[1, 2, 3]]);
  });

  it('Should chunk data correctly when chunkSize < data length', () => {
    const data = [1, 2, 3, 4, 5, 6, 7];
    const result = chunk(data, 3);

    expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('Should throw error for invalid chunkSize (0)', () => {
    const data = [1, 2, 3];

    expect(() => chunk(data, 0)).toThrow('Invalid chunkSize');
  });

  it('Should throw error for invalid chunkSize (negative)', () => {
    const data = [1, 2, 3];

    expect(() => chunk(data, -1)).toThrow('Invalid chunkSize');
  });
});

describe('lookupCommitsInIssues', () => {
  it('Should return an empty array when the commits array is empty', async () => {
    const result = await lookupCommitsInIssues(mockGitHub, []);

    expect(result).toEqual([]);
    expect(mockIssuesAndPullRequests).not.toHaveBeenCalled();
  });

  it('Should return an empty array when all commits are already registered in issues', async () => {
    const commits = createMockCommit(2);

    mockIssuesAndPullRequests.mockResolvedValue({
      data: {
        items: [
          { body: `https://github.com/test/repo/commit/${commits[0].hash}` },
          { body: `https://github.com/test/repo/commit/${commits[1].hash}` },
        ],
      },
    });

    const result = await lookupCommitsInIssues(mockGitHub, commits);

    expect(result).toEqual([]);
    expect(mockIssuesAndPullRequests).toHaveBeenCalledWith({
      q: `repo:test-owner/test-repo type:issue (${commits[0].hash} in:body OR ${commits[1].hash} in:body)`,
      advanced_search: 'true',
    });
  });

  it('Should return only unregistered commits', async () => {
    const commits = createMockCommit(3);

    mockIssuesAndPullRequests.mockResolvedValue({
      data: {
        items: [
          { body: `https://github.com/test/repo/commit/${commits[0].hash}` },
          // Second commit is not registered in issues (should be returned)
          { body: `https://github.com/test/repo/commit/${commits[2].hash}` },
        ],
      },
    });

    const result = await lookupCommitsInIssues(mockGitHub, commits);

    expect(result).toEqual([commits[1]]);
    expect(result.length).toBe(1);
    expect(result[0].hash).toBe(commits[1].hash);

    expect(mockIssuesAndPullRequests).toHaveBeenCalledWith({
      q: `repo:test-owner/test-repo type:issue (${commits[0].hash} in:body OR ${commits[1].hash} in:body OR ${commits[2].hash} in:body)`,
      advanced_search: 'true',
    });
  });

  it('Should handle commits when chunked into multiple API calls', async () => {
    // Create 7 commits to test chunking (chunk size is 5)
    const commits = createMockCommit(7);

    // Mock two API calls since 7 commits will be split into chunks of 5 and 2
    mockIssuesAndPullRequests
      .mockResolvedValueOnce({
        data: {
          items: [
            { body: `https://github.com/test/repo/commit/${commits[0].hash}` },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            { body: `https://github.com/test/repo/commit/${commits[6].hash}` },
          ],
        },
      });

    const result = await lookupCommitsInIssues(mockGitHub, commits);

    // Should return 5 unregistered commits (commits[1] through commits[5])
    expect(result).toHaveLength(5);
    expect(result.map(c => c.hash)).toEqual([
      commits[1].hash,
      commits[2].hash,
      commits[3].hash,
      commits[4].hash,
      commits[5].hash,
    ]);

    // Should make two API calls due to chunking
    expect(mockIssuesAndPullRequests).toHaveBeenCalledTimes(2);
  });
});
