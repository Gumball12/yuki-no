import { GitHub } from '../../src/github/core';
import { createIssueComment } from '../../src/github/createIssueComment';

import { beforeEach, expect, it, vi } from 'vitest';

const MOCK_OWNER_AND_REPO = {
  owner: 'test-owner',
  repo: 'test-repo',
};

const MOCK_ISSUE_NUMBER = 42;
const MOCK_COMMENT_BODY = 'This is a test comment';

vi.mock('../../src/github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { issues: { createComment: vi.fn() } },
    // Mocking for spy
    ownerAndRepo: MOCK_OWNER_AND_REPO,
  })),
}));

const mockGitHub = new GitHub({} as any);

beforeEach(() => {
  vi.clearAllMocks();
});

it('Should create a comment on the issue correctly', async () => {
  (mockGitHub.api.issues.createComment as any).mockResolvedValue({});

  await createIssueComment(mockGitHub, MOCK_ISSUE_NUMBER, MOCK_COMMENT_BODY);

  expect(mockGitHub.api.issues.createComment).toHaveBeenCalledWith({
    owner: MOCK_OWNER_AND_REPO.owner,
    repo: MOCK_OWNER_AND_REPO.repo,
    issue_number: MOCK_ISSUE_NUMBER,
    body: MOCK_COMMENT_BODY,
  });
});
