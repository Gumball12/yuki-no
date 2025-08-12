import { name as ACTION_NAME } from '../../../package.json';
import { GitHub } from '../../github/core';
import * as GetLatestModule from '../../github/getLatestSuccessfulRunISODate';

import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../../github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { actions: { listWorkflowRunsForRepo: vi.fn() } },
  })),
}));

const mockGitHub = new GitHub({} as any);

beforeEach(() => {
  vi.clearAllMocks();
});

it.skip('Should return undefined when there are no successful workflow runs', async () => {
  (mockGitHub.api.actions.listWorkflowRunsForRepo as any).mockResolvedValue({
    data: {
      workflow_runs: [],
    },
  });

  const result =
    await GetLatestModule.getLatestSuccessfulRunISODate(mockGitHub);

  expect(result).toBeUndefined();
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
    },
  });

  const result =
    await GetLatestModule.getLatestSuccessfulRunISODate(mockGitHub);

  expect(result).toBe(EXPECTED_LAST_CREATED_AT);
});
