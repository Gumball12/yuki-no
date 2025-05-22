import type { ReleaseInfo } from '../../../git/getRelease';
import type { GitHub } from '../../../github/core';
import type { Issue } from '../../../github/getOpenedIssues';
import { setIssueLabels } from '../../../github/setIssueLabels';
import { log, unique } from '../../../utils';
import { type PluginOptions } from '../../plugin.types'; // Added for options

export const updateIssueLabelsByRelease = async (
  github: GitHub,
  issue: Issue,
  releaseInfo: ReleaseInfo,
  options?: PluginOptions, // Added options
): Promise<void> => {
  // Use plugin-specific labels if provided in options, otherwise default to global config
  const releaseTrackingLabels = options?.releaseTrackingLabels as string[] || github.config.releaseTrackingLabels;
  const isReleased = releaseInfo.release !== undefined;

  let nextLabels: string[];
  if (isReleased) {
    nextLabels = issue.labels.filter(label => !releaseTrackingLabels.includes(label as string));
  } else {
    // Ensure all labels in releaseTrackingLabels are treated as strings
    const labelsToAdd = releaseTrackingLabels.map(label => String(label));
    nextLabels = unique([...issue.labels, ...labelsToAdd]);
  }
  nextLabels.sort(); // Ensure consistent order for comparison

  log(
    'I',
    `updateIssueLabelsByRelease :: Attempting to update #${issue.number} labels to (${nextLabels.join(', ')})`, options // Log options
  );

  const currentLabelsSorted = [...issue.labels].sort();
  const isLabelChanged =
    JSON.stringify(currentLabelsSorted) !== JSON.stringify(nextLabels);

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
