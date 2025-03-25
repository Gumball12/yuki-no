import type { Commit } from '../../git/getCommits';
import { GitHub } from '../../github/core';
import { lookupCommitsInIssues } from '../../github/lookupCommitsInIssues';

import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../../github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { search: { issuesAndPullRequests: vi.fn() } },
    repoSpec: { owner: 'test-owner', name: 'test-repo' },
  })),
}));

const mockGitHub = new GitHub({} as any);

const createMockCommit = (len: number): Commit[] =>
  [...Array(len)].map((_, ind) => ({
    hash: `aaaa${ind}`.padEnd(7, '0'),
    title: `Commit ${ind}`,
    isoDate: '2023-01-01T00:00:00',
    fileNames: [`file1-${ind}.ts`, `file2-${ind}.ts`],
  }));

beforeEach(() => {
  vi.clearAllMocks();
});

it('Should return an empty array when the commits array is empty', async () => {
  const result = await lookupCommitsInIssues(mockGitHub, []);

  expect(result).toEqual([]);
  expect(mockGitHub.api.search.issuesAndPullRequests).not.toHaveBeenCalled();
});

it('Should return an empty array when all commits are already registered in issues', async () => {
  const commits = createMockCommit(2);

  (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
    data: {
      items: [
        { body: `https://github.com/test/repo/commit/${commits[0].hash}` },
        { body: `https://github.com/test/repo/commit/${commits[1].hash}` },
      ],
    },
  });

  const result = await lookupCommitsInIssues(mockGitHub, commits);

  expect(result).toEqual([]);
  expect(mockGitHub.api.search.issuesAndPullRequests).toHaveBeenCalledWith({
    q: `repo:test-owner/test-repo type:issue (${commits[0].hash} in:body OR ${commits[1].hash} in:body)`,
  });
});

it('Should return only unregistered commits', async () => {
  const commits = createMockCommit(3);

  (mockGitHub.api.search.issuesAndPullRequests as any).mockResolvedValue({
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

  expect(mockGitHub.api.search.issuesAndPullRequests).toHaveBeenCalledWith({
    q: `repo:test-owner/test-repo type:issue (${commits[0].hash} in:body OR ${commits[1].hash} in:body OR ${commits[2].hash} in:body)`,
  });
});
