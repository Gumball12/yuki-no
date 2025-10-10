import type { RestEndpointMethodTypes } from '@octokit/rest';
import { expect } from 'vitest';

type Issue =
  RestEndpointMethodTypes['issues']['listForRepo']['response']['data'][number];

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const expectIssuesForCommits = (issues: Issue[], shas: string[]) => {
  for (const sha of shas) {
    const issuesForCommit = issues.filter(({ body }) =>
      body?.includes(`/commit/${sha}`),
    );
    expect(issuesForCommit.length).toBe(1);
  }
};

export const expectLabels = (issue: Issue, expectedLabels: string[]) => {
  const labels =
    issue.labels?.map(l => (typeof l === 'string' ? l : l.name)) ?? [];

  for (const expected of expectedLabels) {
    expect(labels).toContain(expected);
  }
};
