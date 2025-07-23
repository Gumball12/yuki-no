import type { GitHub } from '../../github/core';
import { getOpenedIssues, type Issue } from '../../github/getOpenedIssues';

import type { TranslateIssueType } from './createPrBody';

import type { RestEndpointMethodTypes } from '@octokit/rest';

export const getNotTrackedIssues = async (
  github: GitHub,
  prNumber: number,
): Promise<{ notTrackedIssues: Issue[]; hasPendingIssues: boolean }> => {
  const translationIssues = await getOpenedIssues(github);
  const prDetails = await getPrDetails(github, prNumber);
  const { body: prBody } = prDetails;

  if (!prBody?.length) {
    throw new Error('');
  }

  const resolvedIssueNumbers = extractIssueNumbers(prBody, 'Resolved');
  const pendingIssueNumbers = extractIssueNumbers(prBody, 'Pending');
  const notTrackedIssues = translationIssues.filter(
    ({ number }) =>
      !resolvedIssueNumbers.includes(number) &&
      !pendingIssueNumbers.includes(number),
  );

  return { notTrackedIssues, hasPendingIssues: pendingIssueNumbers.length > 0 };
};

type PrDetails = RestEndpointMethodTypes['pulls']['get']['response']['data'];

const getPrDetails = async (
  github: GitHub,
  prNumber: number,
): Promise<PrDetails> => {
  const { data } = await github.api.pulls.get({
    ...github.ownerAndRepo,
    pull_number: prNumber,
  });

  return data;
};

const extractIssueNumbers = (
  prBody: string,
  type: TranslateIssueType,
): number[] => {
  const resolvedPattern = new RegExp(`${type} #(\\d+)`, 'g');
  const numbers: number[] = [];
  let match;

  while ((match = resolvedPattern.exec(prBody)) !== null) {
    numbers.push(parseInt(match[1], 10));
  }

  return numbers;
};
