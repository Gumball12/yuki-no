import type { RepoSpec } from '../createConfig';
import type { Commit } from '../git/getCommits';
import { createRepoUrl } from '../git/utils';
import { log } from '../utils';

import type { GitHub } from './core';

export const createIssue = async (
  github: GitHub,
  headRepoSpec: RepoSpec,
  commit: Commit,
): Promise<number> => {
  log(
    'I',
    `createIssue :: Attempting to create issue (${commit.hash.substring(0, 7)})`,
  );

  const commitUrl = `${createRepoUrl(headRepoSpec)}/commit/${commit.hash}`;
  const body = `New updates on head repo.\r\n${commitUrl}`;

  const { data } = await github.api.issues.create({
    ...github.ownerAndRepo,
    title: commit.title,
    body,
    labels: github.configuredLabels,
  });

  const issueNum = data.number;
  log('S', `createIssue :: Issue #${issueNum} created`);

  return issueNum;
};
