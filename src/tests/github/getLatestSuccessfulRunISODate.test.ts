import { name as ACTION_NAME } from '../../../package.json';
import { GitHub } from '../../github/core';
import * as GetLatestModule from '../../github/getLatestSuccessfulRunISODate';

import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../../github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { actions: { listWorkflowRunsForRepo: vi.fn() } },
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
    configuredLabels: ['label1', 'label2'],
  })),
}));

vi.mock('../../github/getTranslationIssues', () => ({
  getTranslationIssues: vi.fn(),
}));

const mockGitHub = new GitHub({} as any);

// Import the mocked function
const { getTranslationIssues } = await import(
  '../../github/getTranslationIssues'
);

beforeEach(() => {
  vi.clearAllMocks();
});

it('Should return undefined when there are no successful workflow runs (first execution)', async () => {
  (mockGitHub.api.actions.listWorkflowRunsForRepo as any).mockResolvedValue({
    data: {
      workflow_runs: [],
      total_count: 0,
    },
  });

  (getTranslationIssues as any).mockResolvedValue([]);

  const result =
    await GetLatestModule.getLatestSuccessfulRunISODate(mockGitHub);

  expect(result).toBeUndefined();
  expect(getTranslationIssues).toHaveBeenCalledWith(mockGitHub, 'all');
});

it('Should return the last execution time when an action with the matching workflow name exists', async () => {
  const EXPECTED_LAST_CREATED_AT = '2023-01-04T12:00:00Z';

  (mockGitHub.api.actions.listWorkflowRunsForRepo as any).mockResolvedValue({
    data: {
      workflow_runs: [
        { name: ACTION_NAME, created_at: '2023-01-03T12:00:00Z' },
        { name: 'other-action', created_at: '2023-01-03T12:00:00Z' },
        { name: 'another-action', created_at: '2023-01-02T12:00:00Z' },
        { name: ACTION_NAME, created_at: EXPECTED_LAST_CREATED_AT },
      ],
      total_count: 4,
    },
  });

  const result =
    await GetLatestModule.getLatestSuccessfulRunISODate(mockGitHub);

  expect(result).toBe(EXPECTED_LAST_CREATED_AT);
});

it('Should throw error when GitHub API shows inconsistent data', async () => {
  (mockGitHub.api.actions.listWorkflowRunsForRepo as any).mockResolvedValue({
    data: {
      workflow_runs: [
        { name: 'other-action', created_at: '2023-01-03T12:00:00Z' },
      ],
      total_count: 1,
    },
  });

  (getTranslationIssues as any).mockResolvedValue([
    {
      number: 1,
      body: 'existing issue',
      labels: ['label1', 'label2'],
      hash: 'abc123',
      isoDate: '2023-01-01T12:00:00Z',
    },
  ]);

  await expect(
    GetLatestModule.getLatestSuccessfulRunISODate(mockGitHub),
  ).rejects.toThrow(
    'GitHub API data inconsistency detected. This might indicate API instability.',
  );
});
