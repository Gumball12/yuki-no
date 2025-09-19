import { GitHub } from '../../github/core';
import * as GetLatestModule from '../../github/getLatestSuccessfulRunISODate';

import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../../github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {
      rest: {
        actions: {
          listWorkflowRunsForRepo: vi.fn(),
        },
      },
    },
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

it('First execution confirmed when (hint && no previous success && no issues) -> returns undefined', async () => {
  const hint = true;

  (
    mockGitHub.api.rest.actions.listWorkflowRunsForRepo as any
  ).mockResolvedValue({
    data: { total_count: 0, workflow_runs: [] },
  });
  (getTranslationIssues as any).mockResolvedValue([]);

  const result = await GetLatestModule.getLatestSuccessfulRunISODate(
    mockGitHub,
    hint,
  );

  expect(result).toBeUndefined();
  expect(getTranslationIssues).toHaveBeenCalledWith(mockGitHub, 'all');
});

it('Not first execution when previous successful runs exist -> returns latest created_at by name match', async () => {
  const hint = true;
  const EXPECTED_LAST_CREATED_AT = '2023-01-04T12:00:00Z';

  (
    mockGitHub.api.rest.actions.listWorkflowRunsForRepo as any
  ).mockResolvedValue({
    data: {
      total_count: 3,
      workflow_runs: [
        {
          created_at: '2023-01-05T12:00:00Z',
          conclusion: 'success',
          name: 'other',
        },
        {
          created_at: EXPECTED_LAST_CREATED_AT,
          conclusion: 'success',
          name: 'yuki-no',
        },
        {
          created_at: '2023-01-03T12:00:00Z',
          conclusion: 'failure',
          name: 'yuki-no',
        },
      ],
    },
  });

  const result = await GetLatestModule.getLatestSuccessfulRunISODate(
    mockGitHub,
    hint,
  );

  expect(result).toBe(EXPECTED_LAST_CREATED_AT);
});

it('No successful runs (but completed exist) and not first-run -> throws due to API inconsistency', async () => {
  (
    mockGitHub.api.rest.actions.listWorkflowRunsForRepo as any
  ).mockResolvedValue({
    data: {
      total_count: 2,
      workflow_runs: [
        {
          created_at: '2023-01-05T12:00:00Z',
          conclusion: 'failure',
          name: 'yuki-no',
        },
        {
          created_at: '2023-01-04T12:00:00Z',
          conclusion: 'cancelled',
          name: 'yuki-no',
        },
      ],
    },
  });
  (getTranslationIssues as any).mockResolvedValue([
    {
      number: 1,
      body: 'existing',
      labels: ['l1'],
      hash: 'h',
      isoDate: '2023-01-01T00:00:00Z',
    },
  ]);

  await expect(
    GetLatestModule.getLatestSuccessfulRunISODate(mockGitHub, false),
  ).rejects.toThrow();
});
