import type { GitHub } from '../../core/src/github/core';
import { getMultilineInput } from '../../core/src/inputUtils';
import { excludeFrom } from '../../core/src/utils';

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
