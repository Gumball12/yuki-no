import type { GitHub } from './core';

export const setIssueLabels = async (
  github: GitHub,
  issueNumber: number,
  labels: string[],
): Promise<string[]> => {
  const { data } = await github.api.issues.setLabels({
    ...github.ownerAndRepo,
    issue_number: issueNumber,
    labels,
  });

  return data.map(label => label.name);
};
