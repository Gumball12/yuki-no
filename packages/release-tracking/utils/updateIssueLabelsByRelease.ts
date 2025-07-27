import type { ReleaseInfo } from './getRelease';
import { getReleaseTrackingLabels } from './getReleaseTrackingLabels';

import type { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { Issue } from '@yuki-no/plugin-sdk/types/github';
import { unique } from '@yuki-no/plugin-sdk/utils/common';
import { log } from '@yuki-no/plugin-sdk/utils/log';

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
    await github.api.issues.setLabels({
      ...github.ownerAndRepo,
      issue_number: issue.number,
      labels: nextLabels,
    });

    log('S', 'updateIssueLabelsByRelease :: Labels changed successfully');
  } else {
    log(
      'S',
      'updateIssueLabelsByRelease :: No change needed (identical labels already exist)',
    );
  }
};
