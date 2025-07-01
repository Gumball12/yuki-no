import type { GitHub } from '../../github/core';
import { getMultilineInput } from '../../inputUtils';
import { excludeFrom } from '../../utils';

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
