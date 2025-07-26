import type { Commit } from '../git/getCommits';
import type { IssueMeta } from '../plugin-sdk/core';
import { log } from '../utils';

import type { GitHub } from './core';
import type { Issue } from './getOpenedIssues';

export const createIssue = async (
  github: GitHub,
  commit: Commit,
  meta: IssueMeta,
): Promise<Issue> => {
  log(
    'I',
    `createIssue :: Attempting to create issue (${commit.hash.substring(0, 7)})`,
  );

  const { data } = await github.api.issues.create({
    ...github.ownerAndRepo,
    title: meta.title,
    body: meta.body,
    labels: meta.labels,
  });

  const issueNum = data.number;
  const isoDate = data.created_at;

  log('S', `createIssue :: Issue #${issueNum} created (${isoDate})`);

  return {
    body: meta.body,
    hash: commit.hash,
    isoDate,
    labels: meta.labels,
    number: issueNum,
  };
};
