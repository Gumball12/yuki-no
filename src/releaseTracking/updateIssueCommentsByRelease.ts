import type { ReleaseInfo } from '../git/getRelease';
import type { GitHub } from '../github/core';
import { createIssueComment } from '../github/createIssueComment';
import { getLastIssueComment } from '../github/getLastIssueComments';
import type { Issue } from '../github/getOpenedIssues';
import { log } from '../utils';

export const updateIssueCommentByRelease = async (
  github: GitHub,
  issue: Issue,
  releaseInfo: ReleaseInfo,
): Promise<void> => {
  const comment = await getLastIssueComment(github, issue.number);
  const isReleased = comment.includes('- release: [v');

  log(
    'I',
    `updateIssueCommentByRelease :: Attempting to add #${issue.number} comment`,
  );

  if (isReleased) {
    log('I', 'updateIssueCommentByRelease :: Release comment already exists');
    return;
  }

  const nextComment = createReleaseComment(releaseInfo);
  const isSameComment = nextComment === comment;

  log('I', `updateIssueCommentByRelease :: Creating comment (${nextComment})`);

  if (isSameComment) {
    log(
      'S',
      'updateIssueCommentByRelease :: Not added (identical comment already exists)',
    );
    return;
  }

  await createIssueComment(github, issue.number, nextComment);
  log('S', 'updateIssueCommentByRelease :: Comment added successfully');
};

const createReleaseComment = ({ prerelease, release }: ReleaseInfo): string => {
  const pRelContent = `- pre-release: ${prerelease ? `[${prerelease.version}](${prerelease.url})` : 'none'}`;
  const relContent = `- release: ${release ? `[${release.version}](${release.url})` : 'none'}`;
  return [pRelContent, relContent].join('\n');
};
