import { GitHub } from '../../src/github/core';
import * as GetOpenedIssuesModule from '../../src/github/getOpenedIssues';

import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../../src/github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { issues: { listForRepo: vi.fn() } },
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
    configuredLabels: ['label1', 'label2'],
  })),
}));

const mockGitHub = new GitHub({} as any);

beforeEach(() => {
  vi.clearAllMocks();
});

it('Should return an empty array when there are no issues', async () => {
  (mockGitHub.api.issues.listForRepo as any).mockResolvedValue({
    data: [],
  });

  const result = await GetOpenedIssuesModule.getOpenedIssues(mockGitHub);

  expect(result).toEqual([]);
});

it('Issues with only different labels from the configuration or without body should be filtered out', async () => {
  (mockGitHub.api.issues.listForRepo as any).mockResolvedValue({
    data: [
      {
        number: 1,
        body: 'body',
        labels: [{ name: 'other-label' }],
        created_at: '2023-01-01T12:00:00Z',
      },
      {
        number: 2,
        body: undefined,
        labels: ['label1', 'label2'],
        created_at: '2023-01-01T12:00:00Z',
      },
    ],
  });

  const result = await GetOpenedIssuesModule.getOpenedIssues(mockGitHub);

  expect(result).toEqual([]);
});

it('Should return only issues that have all configured labels', async () => {
  const EXPECTED_HASH = 'abcd123';

  (mockGitHub.api.issues.listForRepo as any).mockResolvedValue({
    data: [
      {
        number: 1,
        body: `https://github.com/org/name/commit/${EXPECTED_HASH}`,
        created_at: '2023-01-01T12:00:00Z',
        labels: [
          'label1',
          { name: 'label2' },
          { name: undefined },
          'extra-label',
        ],
      },
    ],
  });

  const result = await GetOpenedIssuesModule.getOpenedIssues(mockGitHub);

  expect(result).toEqual([
    expect.objectContaining({
      number: 1,
      labels: ['extra-label', 'label1', 'label2'], // sorted
      hash: EXPECTED_HASH,
    }),
  ]);
});

it('Issues without a hash should be filtered out', async () => {
  const EXPECTED_HASH = 'abcd123';

  (mockGitHub.api.issues.listForRepo as any).mockResolvedValue({
    data: [
      {
        number: 1,
        body: `https://github.com/org/repo/commit/${EXPECTED_HASH}`,
        created_at: '2023-01-01T12:00:00Z',
        labels: [{ name: 'label1' }, { name: 'label2' }],
      },
      {
        number: 2,
        body: 'Issue body without hash',
        created_at: '2023-01-01T12:00:00Z',
        labels: [{ name: 'label1' }, { name: 'label2' }],
      },
    ],
  });

  const result = await GetOpenedIssuesModule.getOpenedIssues(mockGitHub);

  expect(result).toEqual([
    expect.objectContaining({
      number: 1,
      labels: ['label1', 'label2'],
      hash: EXPECTED_HASH,
    }),
  ]);
});
