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

  const lastReleaseComment = findLastReleaseComment(comments)?.body;

  if (!lastReleaseComment) {
    return '';
  }

  return extractReleaseComment(lastReleaseComment);
};

const findLastReleaseComment = (comments: Comment[]) =>
  comments.findLast(isReleaseTrackingComment);

const isReleaseTrackingComment = ({ body }: Comment): boolean => {
  if (!body) {
    return false;
  }

  const hasPrereleaseComment =
    body.includes('- pre-release: none') ||
    body.match(/- pre-release: \[.+?\]\(https:\/\/github\.com\/.+?\)/) !== null;
  const hasReleaseComment =
    body.includes('- release: none') ||
    body.match(/- release: \[.+?\]\(https:\/\/github\.com\/.+?\)/) !== null;

  return hasPrereleaseComment && hasReleaseComment;
};

const extractReleaseComment = (body: string): string => {
  const lines = body.split('\n');
  const preReleaseComment = lines.find(line =>
    line.startsWith('- pre-release: '),
  );
  const releaseComment = lines.find(line => line.startsWith('- release: '));

  return [preReleaseComment, releaseComment].join('\n');
};
