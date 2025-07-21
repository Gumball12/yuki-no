import { GitHub } from '../../src/github/core';
import { createIssue } from '../../src/github/createIssue';

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

vi.mock('../../src/github/core', () => ({
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

  const meta = {
    title: MOCK_COMMIT.title,
    body: `body`,
    labels: MOCK_LABELS,
  };

  const issue = await createIssue(mockGitHub, MOCK_COMMIT, meta);

  expect(issue.number).toBe(ISSUE_NUM);
  expect(mockGitHub.api.issues.create).toHaveBeenCalledWith({
    owner: MOCK_HEAD_REPO_SPEC.owner,
    repo: MOCK_HEAD_REPO_SPEC.name,
    title: meta.title,
    body: meta.body,
    labels: meta.labels,
  });
});
