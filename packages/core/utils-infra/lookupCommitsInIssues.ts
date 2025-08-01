import type { GitHub } from '../infra/github';
import type { RepoSpec } from '../types/config';
import type { Commit } from '../types/git';
import { isNotEmpty, unique } from '../utils/common';
import { extractHashFromIssue } from '../utils/common';
import { log } from '../utils/log';

const COMMIT_CHUNK_UNIT = 5;

export const lookupCommitsInIssues = async (
  github: GitHub,
  commits: Commit[],
): Promise<Commit[]> => {
  if (commits.length === 0) {
    log('I', 'lookupCommitsInIssues :: No commits to check');
    return [];
  }

  log(
    'I',
    `lookupCommitsInIssues :: Starting to check ${commits.length} commits for GitHub Issues registration`,
  );

  const chunkedCommitsList = chunk(commits, COMMIT_CHUNK_UNIT);
  const searchQueries = chunkedCommitsList.map(chunk =>
    createCommitIssueSearchQuery(github.repoSpec, chunk),
  );

  const notCreatedCommits: Commit[] = [];

  // For-loop to prevent parallel API calls
  for (let ind = 0; ind < searchQueries.length; ind++) {
    const q = searchQueries[ind];

    // Using search.issuesAndPullRequests instead of issues.listForRepo for performance:
    // - Server-side filtering: only returns issues that contain specific commit hashes in their body
    // - Avoids downloading thousands of irrelevant issues when we only need a few matches
    // - Much more efficient than client-side filtering of all repository issues
    // Using advanced_search: 'true' to prepare for 2025-09-04 API deprecation
    const { data } = await github.api.search.issuesAndPullRequests({
      q,
      advanced_search: 'true',
    });

    const findHashes = unique(
      data.items.map(extractHashFromIssue).filter(isNotEmpty),
    );

    const chunkedCommits = chunkedCommitsList[ind];
    const currNotCreatedCommits = chunkedCommits.filter(
      commit => !findHashes.includes(commit.hash),
    );

    log(
      'I',
      `lookupCommitsInIssues :: Progress... ${Math.round(((ind + 1) / searchQueries.length) * 100)}%`,
    );

    log(
      'I',
      `lookupCommitsInIssues :: Target commits: ${chunkedCommits.map(({ hash }) => hash.substring(0, 7)).join(' ')}`,
    );

    notCreatedCommits.push(...currNotCreatedCommits);
  }

  log(
    'I',
    `lookupCommitsInIssues :: Completed - total: ${commits.length} / existing: ${commits.length - notCreatedCommits.length} / created: ${notCreatedCommits.length}`,
  );

  return notCreatedCommits;
};

export const chunk = <T>(data: T[], chunkSize: number): T[][] => {
  if (chunkSize >= data.length) {
    return [data];
  }

  if (chunkSize < 1) {
    throw new Error('Invalid chunkSize');
  }

  return [...Array(Math.ceil(data.length / chunkSize))].map<T[]>((_, ind) =>
    data.slice(ind * chunkSize, (ind + 1) * chunkSize),
  );
};

const createCommitIssueSearchQuery = (
  repoSpec: RepoSpec,
  chunk: Commit[],
): string => {
  const query = chunk.map(({ hash }) => `${hash} in:body`).join(' OR ');
  return `repo:${repoSpec.owner}/${repoSpec.name} type:issue (${query})`;
};
