import type { ReleaseInfo } from '../../git/getRelease';
import type { GitHub } from '../../github/core';
import { createIssueComment } from '../../github/createIssueComment';
import { getLastIssueComment } from '../../github/getLastIssueComments';
import type { Issue } from '../../github/getOpenedIssues';
import { log } from '../../utils';

import { getReleaseTrackingLabels } from './getReleaseTrackingLabels';

export const updateIssueCommentByRelease = async (
  github: GitHub,
  issue: Issue,
  releaseInfo: ReleaseInfo,
  releasesAvailable: boolean,
): Promise<void> => {
  const comment = await getLastIssueComment(github, issue.number);
  const isReleased = comment.includes('- release: [');

  log(
    'I',
    `updateIssueCommentByRelease :: Attempting to add #${issue.number} comment`,
  );

  if (isReleased) {
    log('I', 'updateIssueCommentByRelease :: Release comment already exists');
    return;
  }

  const nextComment = createReleaseComment(
    github,
    releaseInfo,
    releasesAvailable,
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
): string => {
  const pRelContent = `- pre-release: ${prerelease ? `[${prerelease.version}](${prerelease.url})` : 'none'}`;
  const relContent = `- release: ${release ? `[${release.version}](${release.url})` : 'none'}`;

  const releaseTrackingLabels = getReleaseTrackingLabels(github);
  const releaseAvailableContent =
    !releasesAvailable &&
    [
      `> This comment and the \`${releaseTrackingLabels.join(', ')}\` label appear because release-tracking is enabled.`,
      '> To disable, remove `core:release-tracking` from the plugins list.',
      '\n',
    ].join('\n');

  return [releaseAvailableContent, pRelContent, relContent]
    .filter(Boolean)
    .join('\n');
};
