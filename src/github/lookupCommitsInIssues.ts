import type { RepoSpec } from '../createConfig';
import type { Commit } from '../git/getCommits';
import { chunk, isNotEmpty, log, unique } from '../utils';

import type { GitHub } from './core';
import { extractHashFromIssue } from './utils';

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
    const { data } = await github.api.search.issuesAndPullRequests({ q });
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

const createCommitIssueSearchQuery = (
  repoSpec: RepoSpec,
  chunk: Commit[],
): string => {
  const query = chunk.map(({ hash }) => `${hash} in:body`).join(' OR ');
  return `repo:${repoSpec.owner}/${repoSpec.name} type:issue (${query})`;
};
