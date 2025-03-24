import type { GitHub } from './core';

type Comment = {
  body?: string;
};

export const getLastIssueComment = async (
  github: GitHub,
  issueNumber: number,
): Promise<string> => {
  const response = await github.api.issues.listComments({
    ...github.ownerAndRepo,
    issue_number: issueNumber,
  });

  const comments = response.data.map<Comment>(item => ({
    body: item.body,
  }));

  return findLastReleaseComment(comments)?.body ?? '';
};

const findLastReleaseComment = (comments: Comment[]) =>
  comments.findLast(isReleaseTrackingComment);

const isReleaseTrackingComment = ({ body }: Comment): boolean => {
  if (!body) {
    return false;
  }

  const lines = body.split('\n');

  return (
    lines.length === 2 &&
    lines[0].startsWith('- pre-release:') &&
    lines[1].startsWith('- release:') &&
    (lines[0].includes('none') || lines[0].includes('](https://')) &&
    (lines[1].includes('none') || lines[1].includes('](https://'))
  );
};
