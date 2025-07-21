import { GitHub } from '../../src/github/core';
import { setIssueLabels } from '../../src/github/setIssueLabels';

import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../../src/github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { issues: { setLabels: vi.fn() } },
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
  })),
}));

const mockGitHub = new GitHub({} as any);

beforeEach(() => {
  vi.clearAllMocks();
});

it('Should return an array of label names when labels are successfully set', async () => {
  const MOCK_ISSUE_NUMBER = 123;
  const MOCK_LABELS = ['bug', 'enhancement', 'documentation'];
  const MOCK_RESPONSE_LABELS = [
    { name: 'bug', id: 1 },
    { name: 'enhancement', id: 2 },
    { name: 'documentation', id: 3 },
  ];

  (mockGitHub.api.issues.setLabels as any).mockResolvedValue({
    data: MOCK_RESPONSE_LABELS,
  });

  const result = await setIssueLabels(
    mockGitHub,
    MOCK_ISSUE_NUMBER,
    MOCK_LABELS,
  );

  expect(result).toEqual(MOCK_LABELS);
});

it('Should return an empty array when an empty label array is input', async () => {
  const MOCK_ISSUE_NUMBER = 123;
  const MOCK_LABELS: string[] = [];

  (mockGitHub.api.issues.setLabels as any).mockResolvedValue({
    data: [],
  });

  const result = await setIssueLabels(
    mockGitHub,
    MOCK_ISSUE_NUMBER,
    MOCK_LABELS,
  );

  expect(result).toEqual([]);
});
