import type { BatchIssueType } from './createPrBody';

import type { RestEndpointMethodTypes } from '@octokit/rest';
import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { Issue } from '@yuki-no/plugin-sdk/types/github';
import { getOpenedIssues } from '@yuki-no/plugin-sdk/utils-infra/getOpenedIssues';
import { log } from '@yuki-no/plugin-sdk/utils/log';

type GetTrackedIssuesReturns = {
  trackedIssues: Issue[];
  shouldTrackIssues: Issue[];
};

export const getTrackedIssues = async (
  github: GitHub,
  prNumber: number,
): Promise<GetTrackedIssuesReturns> => {
  log('I', `getTrackedIssues :: Processing PR #${prNumber}`);

  const prDetails = await getPrDetails(github, prNumber);
  const { body: prBody } = prDetails;

  if (!prBody?.length) {
    log('E', `getTrackedIssues :: PR #${prNumber} body is empty or missing`);
    throw new Error(
      `PR #${prNumber} body is empty or missing. Cannot extract tracked issue numbers.`,
    );
  }

  log('I', `getTrackedIssues :: Filtering translation issues`);
  const translationIssues = await getOpenedIssues(github);
  const translationIssueNumbers = translationIssues.map(({ number }) => number);
  log(
    'I',
    `getTrackedIssues :: Found ${translationIssues.length} translation issues`,
  );

  const trackedIssueNumbers = extractTrackedISsueNumbers(prBody, 'Resolved');
  log(
    'I',
    `getTrackedIssues :: Found ${trackedIssueNumbers.length} tracked issue numbers in PR body`,
  );

  const openedTrackedIssueNumbers = trackedIssueNumbers.filter(number =>
    translationIssueNumbers.includes(number),
  );

  const results = translationIssues.reduce<GetTrackedIssuesReturns>(
    ({ trackedIssues, shouldTrackIssues }, translationIssue) => {
      if (openedTrackedIssueNumbers.includes(translationIssue.number)) {
        trackedIssues.push(translationIssue);
      } else {
        shouldTrackIssues.push(translationIssue);
      }

      return { trackedIssues, shouldTrackIssues };
    },
    {
      trackedIssues: [],
      shouldTrackIssues: [],
    },
  );

  log(
    'S',
    `getTrackedIssues :: Found ${results.trackedIssues.length} tracked issues and ${results.shouldTrackIssues.length} issues to track`,
  );
  return results;
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

const extractTrackedISsueNumbers = (
  prBody: string,
  type: BatchIssueType,
): number[] => {
  const resolvedPattern = new RegExp(`${type} #(\\d+)`, 'g');
  const numbers: number[] = [];
  let match;

  while ((match = resolvedPattern.exec(prBody)) !== null) {
    numbers.push(parseInt(match[1], 10));
  }

  return numbers;
};
