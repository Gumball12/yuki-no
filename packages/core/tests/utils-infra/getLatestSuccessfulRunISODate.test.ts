import { GitHub } from '../../infra/github';
import { getLatestSuccessfulRunISODate } from '../../utils-infra/getLatestSuccessfulRunISODate';

import { beforeEach, expect, it, vi } from 'vitest';

const ACTION_NAME = 'yuki-no';

const mockListWorkflowRunsForRepo = vi.fn();

vi.mock('../../infra/github', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { actions: { listWorkflowRunsForRepo: mockListWorkflowRunsForRepo } },
  })),
}));

const MOCK_CONFIG = {
  accessToken: 'test-token',
  labels: ['test-label'],
  repoSpec: {
    owner: 'test-owner',
    name: 'test-repo',
    branch: 'main',
  },
};

const mockGitHub = new GitHub(MOCK_CONFIG);

beforeEach(() => {
  vi.clearAllMocks();
});

it('Should return undefined when there are no successful workflow runs', async () => {
  mockListWorkflowRunsForRepo.mockResolvedValue({
    data: {
      workflow_runs: [],
    },
  });

  const result = await getLatestSuccessfulRunISODate(mockGitHub);

  expect(result).toBeUndefined();
});

it('Should return the last execution time when an action with the matching workflow name exists', async () => {
  const EXPECTED_LAST_CREATED_AT = '2023-01-04T12:00:00Z';

  mockListWorkflowRunsForRepo.mockResolvedValue({
    data: {
      workflow_runs: [
        { name: ACTION_NAME, created_at: '2023-01-03T12:00:00Z' },
        { name: 'other-action', created_at: '2023-01-03T12:00:00Z' },
        { name: 'another-action', created_at: '2023-01-02T12:00:00Z' },
        { name: ACTION_NAME, created_at: EXPECTED_LAST_CREATED_AT },
      ],
    },
  });

  const result = await getLatestSuccessfulRunISODate(mockGitHub);

  expect(result).toBe(EXPECTED_LAST_CREATED_AT);
});
