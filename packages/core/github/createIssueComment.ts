import type { GitHub } from './core';

export const createIssueComment = async (
  github: GitHub,
  issueNumber: number,
  body: string,
): Promise<void> => {
  await github.api.issues.createComment({
    ...github.ownerAndRepo,
    issue_number: issueNumber,
    body,
  });
};
