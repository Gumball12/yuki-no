import { isNotEmpty, log } from '../utils';

import type { GitHub } from './core';
import { extractHashFromIssue } from './utils';

export type Issue = {
  number: number;
  body: string;
  labels: string[];
  hash: string;
};

export const getOpenedIssues = async (github: GitHub): Promise<Issue[]> => {
  log('I', 'getOpenedIssues :: Starting search for open issues');

  const issues: Issue[] = [];

  let page = 1;
  let totalIssuesChecked = 0;

  while (true) {
    const resp = await github.api.issues.listForRepo({
      ...github.ownerAndRepo,
      state: 'open',
      per_page: 100,
      page,
    });

    if (resp.data.length === 0) {
      break;
    }

    totalIssuesChecked += resp.data.length;

    const openedIssuesWithoutHash = resp.data.map<Omit<Issue, 'hash'>>(
      item => ({
        number: item.number,
        body: item.body ?? '',
        labels: item.labels
          .map(convGithubIssueLabelToString)
          .filter(isNotEmpty)
          .sort(),
      }),
    );

    const openedYukiNoIssues = openedIssuesWithoutHash
      .filter(issue => isYukiNoIssue(github.configuredLabels, issue))
      .map(issue => ({ ...issue, hash: extractHashFromIssue(issue) }))
      .filter(hasHash);

    issues.push(...openedYukiNoIssues);

    page++;

    if (resp.data.length < 100) {
      break;
    }
  }

  log(
    'I',
    `getOpenedIssues :: Completed: Found ${issues.length} Yuki-no issues out of ${totalIssuesChecked} total issues`,
  );

  return issues;
};

const convGithubIssueLabelToString = (
  label: string | { name?: string },
): string => (typeof label === 'string' ? label : (label.name ?? ''));

const isYukiNoIssue = (
  configuredLabels: string[],
  issue: Pick<Issue, 'labels'>,
): boolean => configuredLabels.every(cl => issue.labels.includes(cl));

const hasHash = (issue: { hash?: string }): issue is Issue =>
  issue.hash !== undefined && issue.hash.length > 0;
