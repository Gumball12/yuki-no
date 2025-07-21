import type { ReleaseInfo } from '../../core/src/git/getRelease';
import type { GitHub } from '../../core/src/github/core';
import type { Issue } from '../../core/src/github/getOpenedIssues';
import { setIssueLabels } from '../../core/src/github/setIssueLabels';
import { log, unique } from '../../core/src/utils';

import { getReleaseTrackingLabels } from './getReleaseTrackingLabels';

export const updateIssueLabelsByRelease = async (
  github: GitHub,
  issue: Issue,
  releaseInfo: ReleaseInfo,
): Promise<void> => {
  const releaseTrackingLabels = getReleaseTrackingLabels(github);
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
