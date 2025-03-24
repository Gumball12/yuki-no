import type { ReleaseInfo } from '../../git/getRelease';
import { GitHub } from '../../github/core';
import * as CreateIssueCommentModule from '../../github/createIssueComment';
import * as GetLastIssueCommentsModule from '../../github/getLastIssueComments';
import type { Issue } from '../../github/getOpenedIssues';
import { updateIssueCommentByRelease } from '../../releaseTracking/updateIssueCommentsByRelease';

import { beforeEach, expect, it, vi } from 'vitest';

// Mocking to bypass network requests
vi.mock('../../github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {},
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
  })),
}));

vi.mock('../../github/getLastIssueComments', () => ({
  getLastIssueComment: vi.fn(),
}));

vi.mock('../../github/createIssueComment', () => ({
  createIssueComment: vi.fn(),
}));

const mockGitHub = new GitHub({} as any);

const getLastIssueCommentMock = vi.mocked(
  GetLastIssueCommentsModule.getLastIssueComment,
);
const createIssueCommentMock = vi.mocked(
  CreateIssueCommentModule.createIssueComment,
);

const MOCK_ISSUE: Issue = {
  number: 123,
  body: 'Issue body',
  labels: ['bug', 'enhancement'],
  hash: 'abc123',
};

const MOCK_RELEASE_INFO: ReleaseInfo = {
  prerelease: {
    version: 'v1.0.0-beta.1',
    url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.0-beta.1',
  },
  release: {
    version: 'v1.0.0',
    url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.0',
  },
};

const EXPECTED_RELEASE_COMMENT = {
  prerelease: `- pre-release: [${MOCK_RELEASE_INFO.prerelease?.version}](${MOCK_RELEASE_INFO.prerelease?.url})`,
  release: `- release: [${MOCK_RELEASE_INFO.release?.version}](${MOCK_RELEASE_INFO.release?.url})`,
};

beforeEach(() => {
  vi.clearAllMocks();
});

it('Should not add a new comment if a release comment already exists', async () => {
  getLastIssueCommentMock.mockResolvedValue(
    '- release: [v0.9.0](https://github.com/...)',
  );

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, MOCK_RELEASE_INFO);

  expect(createIssueCommentMock).not.toHaveBeenCalled();
});

it('Should create a correct comment', async () => {
  getLastIssueCommentMock.mockResolvedValue('');

  const preReleaseOnly: ReleaseInfo = {
    prerelease: MOCK_RELEASE_INFO.prerelease,
    release: undefined,
  };

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, preReleaseOnly);

  expect(createIssueCommentMock).toHaveBeenCalledWith(
    mockGitHub,
    MOCK_ISSUE.number,
    [EXPECTED_RELEASE_COMMENT.prerelease, '- release: none'].join('\n'),
  );

  const releaseOnly: ReleaseInfo = {
    prerelease: undefined,
    release: {
      version: 'v1.0.0',
      url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.0',
    },
  };

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, releaseOnly);

  expect(createIssueCommentMock).toHaveBeenCalledWith(
    mockGitHub,
    MOCK_ISSUE.number,
    ['- pre-release: none', EXPECTED_RELEASE_COMMENT.release].join('\n'),
  );

  const noRelease: ReleaseInfo = {
    prerelease: undefined,
    release: undefined,
  };

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, noRelease);

  expect(createIssueCommentMock).toHaveBeenCalledWith(
    mockGitHub,
    MOCK_ISSUE.number,
    '- pre-release: none\n- release: none',
  );
});

it('Should not add a new comment if the same content already exists', async () => {
  const existingComment = [
    EXPECTED_RELEASE_COMMENT.prerelease,
    '- release: none',
  ].join('\n');

  getLastIssueCommentMock.mockResolvedValue(existingComment);

  const prereleaseOnly: ReleaseInfo = {
    prerelease: MOCK_RELEASE_INFO.prerelease,
    release: undefined,
  };

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, prereleaseOnly);

  expect(createIssueCommentMock).not.toHaveBeenCalled();
});
