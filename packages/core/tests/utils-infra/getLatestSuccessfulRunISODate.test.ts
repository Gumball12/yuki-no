import { GitHub } from '../../infra/github';
import { getLatestSuccessfulRunISODate } from '../../utils-infra/getLatestSuccessfulRunISODate';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListWorkflowRunsForRepo = vi.fn();

vi.mock('../../infra/github', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {
      rest: {
        actions: {
          listWorkflowRunsForRepo: mockListWorkflowRunsForRepo,
        },
      },
    },
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
    configuredLabels: ['label1', 'label2'],
  })),
}));

vi.mock('../../utils-infra/getTranslationIssues', () => ({
  getTranslationIssues: vi.fn(),
}));

const mockGitHub = new GitHub({} as any);

const mockGetTranslationIssues = (
  await import('../../utils-infra/getTranslationIssues')
).getTranslationIssues as unknown as ReturnType<typeof vi.fn>;

describe('getLatestSuccessfulRunISODate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('First execution confirmed when (hint && no previous success && no issues) -> returns undefined', async () => {
    const hint = true;

    mockListWorkflowRunsForRepo.mockResolvedValue({
      data: { total_count: 0, workflow_runs: [] },
    });
    mockGetTranslationIssues.mockResolvedValue([]);

    const result = await getLatestSuccessfulRunISODate(mockGitHub, hint);

    expect(result).toBeUndefined();
    expect(mockGetTranslationIssues).toHaveBeenCalledWith(mockGitHub, 'all');
  });

  it('Not first execution when previous successful runs exist -> returns latest created_at by name match', async () => {
    const hint = true;
    const EXPECTED_LAST_CREATED_AT = '2023-01-04T12:00:00Z';

    mockListWorkflowRunsForRepo.mockResolvedValue({
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

    const result = await getLatestSuccessfulRunISODate(mockGitHub, hint);

    expect(result).toBe(EXPECTED_LAST_CREATED_AT);
  });

  it('No successful runs (but completed exist) and not first-run -> throws due to API inconsistency', async () => {
    mockListWorkflowRunsForRepo.mockResolvedValue({
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
    mockGetTranslationIssues.mockResolvedValue([
      {
        number: 1,
        body: 'existing',
        labels: ['l1'],
        hash: 'h',
        isoDate: '2023-01-01T00:00:00Z',
      },
    ]);

    await expect(
      getLatestSuccessfulRunISODate(mockGitHub, false),
    ).rejects.toThrow();
  });
});
