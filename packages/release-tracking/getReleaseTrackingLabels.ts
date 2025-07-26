import type { GitHub } from '@gumball12/yuki-no/github/core';
import { getMultilineInput } from '@gumball12/yuki-no/inputUtils';
import { excludeFrom } from '@gumball12/yuki-no/utils';

const DEFAULT_RELEASE_TRACKING_LABELS = ['pending'];

export const getReleaseTrackingLabels = (github: GitHub): string[] => {
  const rawReleaseLabels = getMultilineInput(
    'RELEASE_TRACKING_LABELS',
    DEFAULT_RELEASE_TRACKING_LABELS,
  );

  const releaseTrackingLabels = excludeFrom(
    rawReleaseLabels,
    github.configuredLabels,
  );

  return releaseTrackingLabels;
};
