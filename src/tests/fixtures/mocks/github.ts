export const actionsCompletedRunsEmpty = {
  total_count: 0,
  workflow_runs: [],
} as const;

export const issuesEmpty: unknown[] = [];

export const searchItems = (
  hashes: string[],
  owner = 'head_owner',
  repo = 'head_repo',
) => ({
  items: hashes.map(hash => ({
    body: `https://github.com/${owner}/${repo}/commit/${hash}`,
  })),
});

export const createdIssueResponse = (number: number) => ({
  number,
  created_at: '2023-01-01T12:00:00Z',
});

export const listComments = (bodies: string[]) =>
  bodies.map(body => ({ body }));

export const labels = (...names: string[]) => names.map(name => ({ name }));
