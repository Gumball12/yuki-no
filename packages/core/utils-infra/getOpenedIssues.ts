import type { GitHub } from '../infra/github';
import type { Issue } from '../types/github';
import { isNotEmpty } from '../utils/common';
import { extractHashFromIssue } from '../utils/common';
import { log } from '../utils/log';

export const getOpenedIssues = async (github: GitHub): Promise<Issue[]> => {
  log('I', 'getOpenedIssues :: Starting search for open issues');

  const allIssues = await github.api.paginate(github.api.issues.listForRepo, {
    ...github.ownerAndRepo,
    state: 'open',
    per_page: 100,
  });

  const totalIssuesChecked = allIssues.length;

  const openedIssuesWithoutHash = allIssues.map<Omit<Issue, 'hash'>>(item => ({
    number: item.number,
    body: item.body ?? '',
    isoDate: item.created_at,
    labels: item.labels
      .map(convGithubIssueLabelToString)
      .filter(isNotEmpty)
      .sort(),
  }));

  const issues = openedIssuesWithoutHash
    .filter(issue => isYukiNoIssue(github.configuredLabels, issue))
    .map(issue => ({ ...issue, hash: extractHashFromIssue(issue) }))
    .filter(hasHash);

  log(
    'I',
    `getOpenedIssues :: Completed: Found ${issues.length} Yuki-no issues out of ${totalIssuesChecked} total issues`,
  );

  issues.sort((a, b) => (a.isoDate > b.isoDate ? 1 : -1));

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
