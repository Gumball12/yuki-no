import { createRepoUrl } from '../../git/utils';
import { GitHub } from '../../github/core';
import { createIssue } from '../../github/createIssue';

import { beforeEach, expect, it, vi } from 'vitest';

const MOCK_LABELS = ['test-label'];
const MOCK_HEAD_REPO_SPEC = {
  owner: 'test-owner',
  name: 'head-repo',
  branch: 'main',
};
const MOCK_COMMIT = {
  hash: '0123456789abcdef',
  title: 'test commit msg',
  isoDate: '2023-01-01T12:00:00Z',
  fileNames: ['test.ts'],
};

vi.mock('../../github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { issues: { create: vi.fn() } },
    // mocking for vitest spy
    ownerAndRepo: {
      owner: MOCK_HEAD_REPO_SPEC.owner,
      repo: MOCK_HEAD_REPO_SPEC.name,
    },
    configuredLabels: MOCK_LABELS,
    repoSpec: {
      owner: MOCK_HEAD_REPO_SPEC.owner,
      name: MOCK_HEAD_REPO_SPEC.name,
      branch: MOCK_HEAD_REPO_SPEC.branch,
    },
  })),
}));
vi.mock('../../git/utils', () => ({
  createRepoUrl: vi
    .fn()
    .mockImplementation(
      repoSpec => `https://github.com/${repoSpec.owner}/${repoSpec.name}`,
    ),
}));

const mockGitHub = new GitHub({} as any);

beforeEach(() => {
  vi.clearAllMocks();
});

it('Should create issue correctly', async () => {
  const ISSUE_NUM = 123;

  (mockGitHub.api.issues.create as any).mockResolvedValue({
    data: {
      number: ISSUE_NUM,
    },
  });

  const issueNumber = await createIssue(
    mockGitHub,
    MOCK_HEAD_REPO_SPEC,
    MOCK_COMMIT,
  );

  expect(issueNumber).toBe(ISSUE_NUM);
  expect(createRepoUrl).toHaveBeenCalledWith(MOCK_HEAD_REPO_SPEC);
  expect(mockGitHub.api.issues.create).toHaveBeenCalledWith({
    owner: MOCK_HEAD_REPO_SPEC.owner,
    repo: MOCK_HEAD_REPO_SPEC.name,
    title: MOCK_COMMIT.title,
    body: expect.stringContaining(
      [
        `New updates on head repo.`,
        `https://github.com/${MOCK_HEAD_REPO_SPEC.owner}/${MOCK_HEAD_REPO_SPEC.name}/commit/${MOCK_COMMIT.hash}`,
      ].join('\r\n'),
    ),
    labels: MOCK_LABELS,
  });
});
