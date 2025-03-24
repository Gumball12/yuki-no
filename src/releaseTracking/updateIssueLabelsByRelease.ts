import type { Config } from '../createConfig';
import type { ReleaseInfo } from '../git/getRelease';
import type { GitHub } from '../github/core';
import type { Issue } from '../github/getOpenedIssues';
import { setIssueLabels } from '../github/setIssueLabels';
import { log, unique } from '../utils';

export const updateIssueLabelsByRelease = async (
  github: GitHub,
  config: Pick<Config, 'releaseTrackingLabels'>,
  issue: Issue,
  releaseInfo: ReleaseInfo,
): Promise<void> => {
  const releaseTrackingLabels = config.releaseTrackingLabels;
  const isReleased = releaseInfo.release !== undefined;
  const nextLabels = isReleased
    ? issue.labels.filter(label => !releaseTrackingLabels.includes(label))
    : unique([...issue.labels, ...releaseTrackingLabels]);

  log(
    'I',
    `updateIssueLabelsByRelease :: Attempting to update #${issue.number} labels (${nextLabels.join(', ')})`,
  );

  const isLabelChanged =
    JSON.stringify(issue.labels) !== JSON.stringify(nextLabels.sort());

  if (isLabelChanged) {
    await setIssueLabels(github, issue.number, nextLabels);
    log('S', 'updateIssueLabelsByRelease :: Labels changed successfully');
  } else {
    log(
      'S',
      'updateIssueLabelsByRelease :: No change needed (identical labels already exist)',
    );
  }
};
