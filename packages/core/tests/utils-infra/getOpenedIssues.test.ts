import { GitHub } from '../../infra/github';
import { getOpenedIssues } from '../../utils-infra/getOpenedIssues';

import { beforeEach, expect, it, vi } from 'vitest';

const mockPaginate = vi.fn();

vi.mock('../../infra/github', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {
      paginate: mockPaginate,
      issues: { listForRepo: vi.fn() },
    },
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
    configuredLabels: ['label1', 'label2'],
  })),
}));

const MOCK_CONFIG = {
  accessToken: 'test-token',
  labels: ['label1', 'label2'],
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

it('Should return an empty array when there are no issues', async () => {
  mockPaginate.mockResolvedValue([]);

  const result = await getOpenedIssues(mockGitHub);

  expect(result).toEqual([]);
});

it('Issues with only different labels from the configuration or without body should be filtered out', async () => {
  mockPaginate.mockResolvedValue([
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
  ]);

  const result = await getOpenedIssues(mockGitHub);

  expect(result).toEqual([]);
});

it('Should return only issues that have all configured labels', async () => {
  const EXPECTED_HASH = 'abcd123';

  mockPaginate.mockResolvedValue([
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
  ]);

  const result = await getOpenedIssues(mockGitHub);

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

  mockPaginate.mockResolvedValue([
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
  ]);

  const result = await getOpenedIssues(mockGitHub);

  expect(result).toEqual([
    expect.objectContaining({
      number: 1,
      labels: ['label1', 'label2'],
      hash: EXPECTED_HASH,
    }),
  ]);
});
