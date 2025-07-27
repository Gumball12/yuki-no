import { GitHub } from '../../infra/github';
import { createIssue } from '../../utils-infra/createIssue';

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

const mockCreate = vi.fn();

vi.mock('../../infra/github', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { issues: { create: mockCreate } },
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

const MOCK_CONFIG = {
  accessToken: 'test-token',
  labels: MOCK_LABELS,
  repoSpec: MOCK_HEAD_REPO_SPEC,
};

const mockGitHub = new GitHub(MOCK_CONFIG);

beforeEach(() => {
  vi.clearAllMocks();
});

it('Should create issue correctly', async () => {
  const ISSUE_NUM = 123;

  mockCreate.mockResolvedValue({
    data: {
      number: ISSUE_NUM,
    },
  });

  const meta = {
    title: MOCK_COMMIT.title,
    body: `body`,
    labels: MOCK_LABELS,
  };

  const issue = await createIssue(mockGitHub, meta);

  expect(issue.number).toBe(ISSUE_NUM);
  expect(mockCreate).toHaveBeenCalledWith({
    owner: MOCK_HEAD_REPO_SPEC.owner,
    repo: MOCK_HEAD_REPO_SPEC.name,
    title: meta.title,
    body: meta.body,
    labels: meta.labels,
  });
});
