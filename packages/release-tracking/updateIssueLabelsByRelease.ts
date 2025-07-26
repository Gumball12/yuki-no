import { getReleaseTrackingLabels } from './getReleaseTrackingLabels';

import type { ReleaseInfo } from '@gumball12/yuki-no/git/getRelease';
import type { GitHub } from '@gumball12/yuki-no/github/core';
import type { Issue } from '@gumball12/yuki-no/github/getOpenedIssues';
import { setIssueLabels } from '@gumball12/yuki-no/github/setIssueLabels';
import { log, unique } from '@gumball12/yuki-no/utils';

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
