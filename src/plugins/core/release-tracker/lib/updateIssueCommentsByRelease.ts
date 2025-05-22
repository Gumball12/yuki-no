import type { ReleaseInfo } from '../../../git/getRelease';
import type { GitHub } from '../../../github/core';
import { createIssueComment } from '../../../github/createIssueComment';
import { getLastIssueComment } from '../../../github/getLastIssueComments';
import type { Issue } from '../../../github/getOpenedIssues';
import { log } from '../../../utils';
import { type PluginOptions } from '../../plugin.types'; // Added for options

export const updateIssueCommentByRelease = async (
  github: GitHub,
  issue: Issue,
  releaseInfo: ReleaseInfo,
  releasesAvailable: boolean,
  options?: PluginOptions, // Added options
): Promise<void> => {
  const comment = await getLastIssueComment(github, issue.number);
  const isReleased = comment.includes('- release: [v');

  log(
    'I',
    `updateIssueCommentByRelease :: Attempting to add #${issue.number} comment`, options // Log options
  );

  if (isReleased) {
    log('I', 'updateIssueCommentByRelease :: Release comment already exists');
    return;
  }

  // Options could influence comment creation in the future, passed here for that.
  const nextComment = createReleaseComment(
    github,
    releaseInfo,
    releasesAvailable,
    options,
  );

  log('I', `updateIssueCommentByRelease :: Creating comment (${nextComment})`);

  if (nextComment === comment) {
    log(
      'S',
      'updateIssueCommentByRelease :: Not added (identical comment already exists)',
    );
    return;
  }

  await createIssueComment(github, issue.number, nextComment);
  log('S', 'updateIssueCommentByRelease :: Comment added successfully');
};

const createReleaseComment = (
  github: GitHub,
  { prerelease, release }: ReleaseInfo,
  releasesAvailable: boolean,
  options?: PluginOptions, // Added options
): string => {
  // Options are not used in this version for comment content but could be in the future
  // e.g. options.commentTemplate or similar
  const pRelContent = `- pre-release: ${prerelease ? `[${prerelease.version}](${prerelease.url})` : 'none'}`;
  const relContent = `- release: ${release ? `[${release.version}](${release.url})` : 'none'}`;

  // Determine labels to display in the comment note.
  // If plugin options provide specific labels, use them. Otherwise, use global config labels.
  // This assumes options might have a structure like { releaseTrackingLabels: ['label1', 'label2'] }
  // For consistency, let's assume the option name would be `releaseTrackingLabels` if provided.
  const labelsToMention = options?.releaseTrackingLabels || github.config.releaseTrackingLabels;


  const releaseAvailableContent =
    !releasesAvailable &&
    [
      `> This comment and the \`${labelsToMention.join(', ')}\` label appear because release-tracking is enabled.`,
      '> To disable, remove the `release-tracking` option or set it to `false`.',
      '\n',
    ].join('\n');

  return [releaseAvailableContent, pRelContent, relContent]
    .filter(Boolean)
    .join('\n');
};
