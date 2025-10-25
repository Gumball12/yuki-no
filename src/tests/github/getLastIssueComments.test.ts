import { GitHub } from '../../github/core';
import { getLastIssueComment } from '../../github/getLastIssueComments';

import { beforeEach, expect, it, vi } from 'vitest';

const MOCK_OWNER_AND_REPO = {
  owner: 'test-owner',
  repo: 'test-repo',
};

const MOCK_ISSUE_NUMBER = 42;

vi.mock('../../github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: { issues: { listComments: vi.fn() } },
    // Mocking for spy
    ownerAndRepo: MOCK_OWNER_AND_REPO,
  })),
}));

const mockGitHub = new GitHub({} as any);

beforeEach(() => {
  vi.clearAllMocks();
});

it('Should return the last release tracking comment when release tracking comments exist', async () => {
  const LAST_COMMENT =
    '- pre-release: none\n- release: [v6](https://github.com/test/repo/releases/tag/v6)';

  (mockGitHub.api.issues.listComments as any).mockResolvedValue({
    data: [
      { body: 'Comment 1' },
      {
        body: '- pre-release: [v6-beta.0](https://github.com/test/repo/releases/tag/v6-beta.0)\n- release: [v6](https://github.com/test/repo/releases/tag/v6)',
      },
      { body: 'Comment 2' },
      { body: LAST_COMMENT },

      // Invalid format
      { body: '- prerelease: [v6.2.0-beta.0]\n- release: [v6.1.1]' },
      {
        body: '- release: [v6](https://github.com/test/repo/releases/tag/v6)',
      },
      {
        body: '- pre-release: [v6-beta.0](https://github.com/test/repo/releases/tag/v6-beta.0)',
      },
    ],
  });

  const result = await getLastIssueComment(mockGitHub, MOCK_ISSUE_NUMBER);

  expect(result).toBe(LAST_COMMENT);
  expect(mockGitHub.api.issues.listComments).toHaveBeenCalledWith({
    owner: MOCK_OWNER_AND_REPO.owner,
    repo: MOCK_OWNER_AND_REPO.repo,
    issue_number: MOCK_ISSUE_NUMBER,
  });
});

it('Should return an empty string when there are no release tracking comments', async () => {
  (mockGitHub.api.issues.listComments as any).mockResolvedValue({
    data: [{ body: 'Comment 1' }, { body: 'Comment 2' }],
  });

  const result = await getLastIssueComment(mockGitHub, MOCK_ISSUE_NUMBER);

  expect(result).toBe('');
});

it('Should return an empty string when there are no comments', async () => {
  (mockGitHub.api.issues.listComments as any).mockResolvedValue({
    data: [],
  });

  const result = await getLastIssueComment(mockGitHub, MOCK_ISSUE_NUMBER);

  expect(result).toBe('');
});

it('Should ignore comments with undefined body', async () => {
  const COMMENT =
    '- pre-release: [v6.2.0-beta.0](https://github.com/test/repo/releases/tag/v6.2.0-beta.0)\n- release: none';

  (mockGitHub.api.issues.listComments as any).mockResolvedValue({
    data: [
      { body: undefined },
      {
        body: COMMENT,
      },
      { body: undefined },
    ],
  });

  const result = await getLastIssueComment(mockGitHub, MOCK_ISSUE_NUMBER);

  expect(result).toBe(COMMENT);
});

it('should strip instructional prelude and return only release-tracking lines', async () => {
  const RELEASE_AVAILABLE_CONTENT = `> This comment and the \`pending\` label appear because release-tracking is enabled.
> To disable, remove the \`release-tracking\` option or set it to \`false\`.


`;
  const RELEASE_CONTENT = `- pre-release: [v6.1.0-beta.1](https://github.com/vitejs/vite/releases/tag/v6.1.0-beta.1)
- release: [v6.1.0](https://github.com/vitejs/vite/releases/tag/v6.1.0)`;
  const COMMENT = [RELEASE_AVAILABLE_CONTENT, RELEASE_CONTENT].join('\n');

  (mockGitHub.api.issues.listComments as any).mockResolvedValue({
    data: [{ body: COMMENT }],
  });

  const result = await getLastIssueComment(mockGitHub, MOCK_ISSUE_NUMBER);

  expect(result).toBe(RELEASE_CONTENT);
});
