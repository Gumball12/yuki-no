import { GitHub } from '../../infra/github';
import { getLatestSuccessfulRunISODate } from '../../utils-infra/getLatestSuccessfulRunISODate';

import { beforeEach, expect, it, vi } from 'vitest';

const WORKFLOW_NAME = 'yuki-no';

const mockListWorkflowRunsForRepo = vi.fn();
const mockPaginate = vi.fn();
const mockListForRepo = vi.fn();

vi.mock('../../infra/github', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {
      actions: { listWorkflowRunsForRepo: mockListWorkflowRunsForRepo },
      paginate: mockPaginate,
      issues: { listForRepo: mockListForRepo },
    },
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
    configuredLabels: ['test-label'],
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

it('Should return undefined on the first run when no successful workflow or tracked issues exist', async () => {
  mockListWorkflowRunsForRepo.mockResolvedValue({
    data: {
      total_count: 0,
      workflow_runs: [],
    },
  });
  mockPaginate.mockResolvedValue([]);

  const result = await getLatestSuccessfulRunISODate(mockGitHub, true);

  expect(result).toBeUndefined();
  expect(mockListWorkflowRunsForRepo).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    status: 'completed',
    per_page: 100,
  });
  expect(mockPaginate).toHaveBeenCalledWith(mockListForRepo, {
    owner: 'test-owner',
    repo: 'test-repo',
    state: 'all',
    per_page: 100,
  });
});

it('Should return the last execution time when a successful run with the matching workflow name exists', async () => {
  const EXPECTED_LAST_CREATED_AT = '2023-01-04T12:00:00Z';

  mockListWorkflowRunsForRepo.mockResolvedValue({
    data: {
      workflow_runs: [
        {
          name: WORKFLOW_NAME,
          created_at: EXPECTED_LAST_CREATED_AT,
          conclusion: 'success',
        },
        {
          name: 'other-action',
          created_at: '2023-01-03T12:00:00Z',
          conclusion: 'success',
        },
        {
          name: WORKFLOW_NAME,
          created_at: '2023-01-02T12:00:00Z',
          conclusion: 'failure',
        },
      ],
      total_count: 3,
    },
  });

  const result = await getLatestSuccessfulRunISODate(mockGitHub, false);

  expect(result).toBe(EXPECTED_LAST_CREATED_AT);
  expect(mockPaginate).not.toHaveBeenCalled();
});

it('Should throw when first-run is hinted but tracked issues already exist', async () => {
  mockListWorkflowRunsForRepo.mockResolvedValue({
    data: {
      total_count: 0,
      workflow_runs: [],
    },
  });
  mockPaginate.mockResolvedValue([
    {
      number: 1,
      body: 'https://github.com/test-owner/test-repo/commit/abc1234',
      created_at: '2023-01-01T12:00:00Z',
      labels: ['test-label'],
    },
  ]);

  await expect(getLatestSuccessfulRunISODate(mockGitHub, true)).rejects.toThrow(
    'GitHub API data inconsistency detected. This might indicate API instability.',
  );
});

it('Should throw when completed runs exist but no successful yuki-no run exists', async () => {
  mockListWorkflowRunsForRepo.mockResolvedValue({
    data: {
      total_count: 2,
      workflow_runs: [
        {
          name: WORKFLOW_NAME,
          created_at: '2023-01-05T12:00:00Z',
          conclusion: 'failure',
        },
        {
          name: WORKFLOW_NAME,
          created_at: '2023-01-04T12:00:00Z',
          conclusion: 'cancelled',
        },
      ],
    },
  });

  await expect(
    getLatestSuccessfulRunISODate(mockGitHub, false),
  ).rejects.toThrow(
    'GitHub API data inconsistency detected. This might indicate API instability.',
  );
  expect(mockPaginate).not.toHaveBeenCalled();
});
