import { GitHub } from '../../infra/github';
import { getLatestSuccessfulRunISODate } from '../../utils-infra/getLatestSuccessfulRunISODate';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const CURRENT_WORKFLOW_PATH = '.github/workflows/current.yml';
const CURRENT_WORKFLOW_REF = `test-owner/test-repo/${CURRENT_WORKFLOW_PATH}@refs/heads/main`;
const ORIGINAL_ENV = { ...process.env };

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
  process.env = {
    ...ORIGINAL_ENV,
    GITHUB_WORKFLOW_REF: CURRENT_WORKFLOW_REF,
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
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
    page: 1,
  });
  expect(mockPaginate).toHaveBeenCalledWith(mockListForRepo, {
    owner: 'test-owner',
    repo: 'test-repo',
    state: 'all',
    per_page: 100,
  });
});

it('Should return the last execution time when a successful run with the matching workflow path exists', async () => {
  const EXPECTED_LAST_CREATED_AT = '2023-01-04T12:00:00Z';

  mockListWorkflowRunsForRepo.mockResolvedValue({
    data: {
      workflow_runs: [
        {
          name: 'renamed-workflow',
          path: CURRENT_WORKFLOW_PATH,
          created_at: EXPECTED_LAST_CREATED_AT,
          conclusion: 'success',
        },
        {
          name: 'yuki-no',
          path: '.github/workflows/other.yml',
          created_at: '2023-01-03T12:00:00Z',
          conclusion: 'success',
        },
        {
          name: 'renamed-workflow',
          path: CURRENT_WORKFLOW_PATH,
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

it('Should paginate until a successful run for the current workflow path is found', async () => {
  const EXPECTED_LAST_CREATED_AT = '2023-01-05T12:00:00Z';

  mockListWorkflowRunsForRepo
    .mockResolvedValueOnce({
      data: {
        total_count: 101,
        workflow_runs: Array.from({ length: 100 }, (_, index) => ({
          name: `other-workflow-${index}`,
          path: '.github/workflows/other.yml',
          created_at: `2023-01-${String((index % 28) + 1).padStart(2, '0')}T12:00:00Z`,
          conclusion: 'success',
        })),
      },
    })
    .mockResolvedValueOnce({
      data: {
        total_count: 101,
        workflow_runs: [
          {
            name: 'renamed-workflow',
            path: CURRENT_WORKFLOW_PATH,
            created_at: EXPECTED_LAST_CREATED_AT,
            conclusion: 'success',
          },
        ],
      },
    });

  const result = await getLatestSuccessfulRunISODate(mockGitHub, false);

  expect(result).toBe(EXPECTED_LAST_CREATED_AT);
  expect(mockListWorkflowRunsForRepo).toHaveBeenNthCalledWith(1, {
    owner: 'test-owner',
    repo: 'test-repo',
    status: 'completed',
    per_page: 100,
    page: 1,
  });
  expect(mockListWorkflowRunsForRepo).toHaveBeenNthCalledWith(2, {
    owner: 'test-owner',
    repo: 'test-repo',
    status: 'completed',
    per_page: 100,
    page: 2,
  });
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
    `Unable to determine a safe successful-run baseline for workflow path "${CURRENT_WORKFLOW_PATH}": no successful completed run matched the current workflow path. Tracked issues already exist.`,
  );
});

it('Should keep the conservative stop behavior when no matching successful workflow-path run exists', async () => {
  mockListWorkflowRunsForRepo.mockResolvedValue({
    data: {
      total_count: 2,
      workflow_runs: [
        {
          name: 'renamed-workflow',
          path: CURRENT_WORKFLOW_PATH,
          created_at: '2023-01-05T12:00:00Z',
          conclusion: 'failure',
        },
        {
          name: 'yuki-no',
          path: '.github/workflows/other.yml',
          created_at: '2023-01-04T12:00:00Z',
          conclusion: 'success',
        },
      ],
    },
  });

  await expect(
    getLatestSuccessfulRunISODate(mockGitHub, false),
  ).rejects.toThrow(
    `Unable to determine a safe successful-run baseline for workflow path "${CURRENT_WORKFLOW_PATH}": no successful completed run matched the current workflow path.`,
  );
  expect(mockPaginate).not.toHaveBeenCalled();
});

it('Should throw when GitHub returns an empty completed-run page before the reported history is exhausted', async () => {
  mockListWorkflowRunsForRepo.mockResolvedValue({
    data: {
      total_count: 3,
      workflow_runs: [],
    },
  });

  await expect(
    getLatestSuccessfulRunISODate(mockGitHub, false),
  ).rejects.toThrow(
    'GitHub API returned an empty completed-run page before the reported history was exhausted.',
  );
  expect(mockPaginate).not.toHaveBeenCalled();
});

it('Should throw when GitHub returns a partial completed-run page before the reported history is exhausted', async () => {
  mockListWorkflowRunsForRepo.mockResolvedValue({
    data: {
      total_count: 150,
      workflow_runs: Array.from({ length: 99 }, (_, index) => ({
        name: `other-workflow-${index}`,
        path: '.github/workflows/other.yml',
        created_at: `2023-01-${String((index % 28) + 1).padStart(2, '0')}T12:00:00Z`,
        conclusion: 'success',
      })),
    },
  });

  await expect(
    getLatestSuccessfulRunISODate(mockGitHub, false),
  ).rejects.toThrow(
    'GitHub API returned a partial completed-run page before the reported history was exhausted.',
  );
  expect(mockPaginate).not.toHaveBeenCalled();
});

it('Should throw when GITHUB_WORKFLOW_REF is missing', async () => {
  delete process.env.GITHUB_WORKFLOW_REF;

  await expect(
    getLatestSuccessfulRunISODate(mockGitHub, false),
  ).rejects.toThrow(
    'GITHUB_WORKFLOW_REF is required to identify the current workflow path.',
  );
  expect(mockListWorkflowRunsForRepo).not.toHaveBeenCalled();
});

it('Should throw when GITHUB_WORKFLOW_REF cannot be parsed into a workflow path', async () => {
  process.env.GITHUB_WORKFLOW_REF = 'test-owner/test-repo@refs/heads/main';

  await expect(
    getLatestSuccessfulRunISODate(mockGitHub, false),
  ).rejects.toThrow(
    'Failed to parse workflow path from GITHUB_WORKFLOW_REF: test-owner/test-repo@refs/heads/main',
  );
  expect(mockListWorkflowRunsForRepo).not.toHaveBeenCalled();
});

it('Should ignore issues that do not satisfy tracked-issue matching rules', async () => {
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
      labels: ['different-label'],
    },
    {
      number: 2,
      body: 'https://github.com/test-owner/test-repo/commit/def5678',
      created_at: '2023-01-02T12:00:00Z',
      labels: [{}],
    },
    {
      number: 3,
      body: 'no commit url here',
      created_at: '2023-01-03T12:00:00Z',
      labels: ['test-label'],
    },
    {
      number: 4,
      body: undefined,
      created_at: '2023-01-04T12:00:00Z',
      labels: ['test-label'],
    },
  ]);

  const result = await getLatestSuccessfulRunISODate(mockGitHub, true);

  expect(result).toBeUndefined();
  expect(mockPaginate).toHaveBeenCalledWith(mockListForRepo, {
    owner: 'test-owner',
    repo: 'test-repo',
    state: 'all',
    per_page: 100,
  });
});
