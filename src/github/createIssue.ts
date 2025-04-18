import type { RepoSpec } from '../createConfig';
import type { Commit } from '../git/getCommits';
import { createRepoUrl } from '../git/utils';
import { log } from '../utils';

import type { GitHub } from './core';
import type { Issue } from './getOpenedIssues';
import { getISODate } from './utils';

export const createIssue = async (
  github: GitHub,
  headRepoSpec: RepoSpec,
  commit: Commit,
): Promise<Issue> => {
  log(
    'I',
    `createIssue :: Attempting to create issue (${commit.hash.substring(0, 7)})`,
  );

  const commitUrl = `${createRepoUrl(headRepoSpec)}/commit/${commit.hash}`;
  const body = `New updates on head repo.\r\n${commitUrl}`;
  const labels = github.configuredLabels;

  const { data } = await github.api.issues.create({
    ...github.ownerAndRepo,
    title: commit.title,
    body,
    labels,
  });

  const issueNum = data.number;
  const isoDate = getISODate(new Date());

  log('S', `createIssue :: Issue #${issueNum} created (${isoDate})`);

  return {
    body,
    hash: commit.hash,
    isoDate,
    labels,
    number: issueNum,
  };
};
