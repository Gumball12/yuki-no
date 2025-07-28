import type { BatchIssueType } from './createPrBody';

import type { RestEndpointMethodTypes } from '@octokit/rest';
import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { Issue } from '@yuki-no/plugin-sdk/types/github';
import { getOpenedIssues } from '@yuki-no/plugin-sdk/utils-infra/getOpenedIssues';

type GetTrackedIssuesReturns = {
  trackedIssues: Issue[];
  shouldTrackIssues: Issue[];
};

export const getTrackedIssues = async (
  github: GitHub,
  prNumber: number,
): Promise<GetTrackedIssuesReturns> => {
  const prDetails = await getPrDetails(github, prNumber);
  const { body: prBody } = prDetails;

  if (!prBody?.length) {
    throw new Error(
      `PR #${prNumber} body is empty or missing. Cannot extract tracked issue numbers.`,
    );
  }

  const pendedTranslationLabels = await getYukiNoReleaseTrackingLabels(github);

  const translationIssues = (await getOpenedIssues(github)).filter(
    ({ labels }) => labels.every(l => !pendedTranslationLabels.includes(l)),
  );
  const translationIssueNumbers = translationIssues.map(({ number }) => number);

  const trackedIssueNumbers = extractTrackedISsueNumbers(prBody, 'Resolved');
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

const getYukiNoReleaseTrackingLabels = async (
  github: GitHub,
): Promise<string[]> => {
  try {
    const { getReleaseTrackingLabels } = await import(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      '@yuki-no/plugin-release-tracking/getReleaseTrackingLabels'
    );

    return getReleaseTrackingLabels(github);
  } catch {
    // noop
  }

  return [];
};
