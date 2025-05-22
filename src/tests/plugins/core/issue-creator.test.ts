// @vitest-environment node
import IssueCreatorPlugin from '../../../plugins/core/issue-creator';
import { type Config } from '../../../createConfig';
import { type Git } from '../../../git/core';
import { type GitHub } from '../../../github/core';
import { type Issue } from '../../../github/getOpenedIssues';
import { type Commit } from '../../../git/getCommits';

// Mock dependencies
vi.mock('../../../github/getLatestSuccessfulRunISODate');
vi.mock('../../../git/getCommits');
vi.mock('../../../github/lookupCommitsInIssues');
vi.mock('../../../github/createIssue');
vi.mock('../../../utils'); // For log

import { getLatestSuccessfulRunISODate } from '../../../github/getLatestSuccessfulRunISODate';
import { getCommits } from '../../../git/getCommits';
import { lookupCommitsInIssues } from '../../../github/lookupCommitsInIssues';
import { createIssue } from '../../../github/createIssue';
import { log } from '../../../utils';

describe('Core Plugin: IssueCreatorPlugin - onSync', () => {
  const mockConfig = {
    headRepoSpec: { owner: 'test', name: 'head', branch: 'main' },
    labels: ['sync'],
    // ... other necessary config properties
  } as unknown as Config;

  const mockGit = {} as Git; // Add methods if plugin uses them directly
  const mockGithub = {} as GitHub; // Add methods if plugin uses them directly

  const mockCommits: Commit[] = [
    { hash: 'c1', message: 'Commit 1', files: ['file1.txt'] },
    { hash: 'c2', message: 'Commit 2', files: ['file2.txt'] },
  ];
  const mockIssues: Issue[] = [
    { hash: 'c1', number: 1, title: 'Issue for Commit 1', labels: [], body: '', state: 'open', html_url: '' },
    { hash: 'c2', number: 2, title: 'Issue for Commit 2', labels: [], body: '', state: 'open', html_url: '' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock implementations
    vi.mocked(getLatestSuccessfulRunISODate).mockResolvedValue('2023-01-01T00:00:00Z');
    vi.mocked(getCommits).mockReturnValue(mockCommits);
    vi.mocked(lookupCommitsInIssues).mockResolvedValue(mockCommits); // Assume all commits need issues
    vi.mocked(createIssue).mockImplementation(async (_gh, _repoSpec, commit) => {
      const foundIssue = mockIssues.find(issue => issue.hash === commit.hash);
      if (!foundIssue) throw new Error(`Test error: No mock issue found for commit ${commit.hash}`);
      return foundIssue;
    });
  });

  it('should call dependencies and create issues for commits', async () => {
    const pluginOptions = { customOption: 'testValue' };
    const createdIssues = await IssueCreatorPlugin.onSync!(mockConfig, mockGit, mockGithub, pluginOptions);

    expect(getLatestSuccessfulRunISODate).toHaveBeenCalledWith(mockGithub);
    expect(getCommits).toHaveBeenCalledWith(mockConfig, mockGit, '2023-01-01T00:00:00Z');
    expect(lookupCommitsInIssues).toHaveBeenCalledWith(mockGithub, mockCommits);
    expect(createIssue).toHaveBeenCalledTimes(mockCommits.length);
    expect(createIssue).toHaveBeenCalledWith(mockGithub, mockConfig.headRepoSpec, mockCommits[0]);
    expect(createIssue).toHaveBeenCalledWith(mockGithub, mockConfig.headRepoSpec, mockCommits[1]);
    expect(createdIssues).toEqual(mockIssues);
    expect(log).toHaveBeenCalledWith('I', 'core:issue-creator :: Synchronization started', pluginOptions);
    expect(log).toHaveBeenCalledWith('S', `core:issue-creator :: ${mockIssues.length} issues created successfully`);
  });

  it('should handle no new commits to create issues for', async () => {
    vi.mocked(lookupCommitsInIssues).mockResolvedValue([]); // No commits need issues
    const createdIssues = await IssueCreatorPlugin.onSync!(mockConfig, mockGit, mockGithub);

    expect(createIssue).not.toHaveBeenCalled();
    expect(createdIssues).toEqual([]);
    expect(log).toHaveBeenCalledWith('S', `core:issue-creator :: 0 issues created successfully`);
  });

  it('should correctly pass plugin options (though not used by current core logic)', async () => {
    const specificOptions = { labelPrefix: 'TRACK:' };
    await IssueCreatorPlugin.onSync!(mockConfig, mockGit, mockGithub, specificOptions);
    // Verify options are logged, showing they are received
    expect(log).toHaveBeenCalledWith('I', 'core:issue-creator :: Synchronization started', specificOptions);
  });
});
