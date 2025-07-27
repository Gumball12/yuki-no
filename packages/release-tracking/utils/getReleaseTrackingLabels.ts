import type { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import { getMultilineInput } from '@yuki-no/plugin-sdk/utils/input';

const DEFAULT_RELEASE_TRACKING_LABELS = ['pending'];

export const getReleaseTrackingLabels = (github: GitHub): string[] => {
  const rawReleaseLabels = getMultilineInput(
    'YUKI_NO_RELEASE_TRACKING_LABELS',
    DEFAULT_RELEASE_TRACKING_LABELS,
  );

  const releaseTrackingLabels = excludeFrom(
    rawReleaseLabels,
    github.configuredLabels,
  );

  return releaseTrackingLabels;
};

const excludeFrom = (excludeSource: string[], reference: string[]): string[] =>
  excludeSource.filter(sourceEl => !reference.includes(sourceEl));
