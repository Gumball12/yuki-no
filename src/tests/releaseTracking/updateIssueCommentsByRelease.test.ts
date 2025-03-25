import type { ReleaseInfo } from '../../git/getRelease';
import { GitHub } from '../../github/core';
import * as CreateIssueCommentModule from '../../github/createIssueComment';
import * as GetLastIssueCommentsModule from '../../github/getLastIssueComments';
import type { Issue } from '../../github/getOpenedIssues';
import { updateIssueCommentByRelease } from '../../releaseTracking/updateIssueCommentsByRelease';

import { beforeEach, expect, it, vi } from 'vitest';

const MOCK_RELEASE_TRACKING_LABELS = ['pending'];

// Mocking to bypass network requests
vi.mock('../../github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {},
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
    releaseTrackingLabels: MOCK_RELEASE_TRACKING_LABELS,
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
  isoDate: '2023-01-01T12:00:00',
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

  await updateIssueCommentByRelease(
    mockGitHub,
    MOCK_ISSUE,
    MOCK_RELEASE_INFO,
    false,
  );

  expect(createIssueCommentMock).not.toHaveBeenCalled();
});

it('Should create a correct comment', async () => {
  getLastIssueCommentMock.mockResolvedValue('');

  const preReleaseOnly: ReleaseInfo = {
    prerelease: MOCK_RELEASE_INFO.prerelease,
    release: undefined,
  };

  await updateIssueCommentByRelease(
    mockGitHub,
    MOCK_ISSUE,
    preReleaseOnly,
    false,
  );

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

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, releaseOnly, false);

  expect(createIssueCommentMock).toHaveBeenCalledWith(
    mockGitHub,
    MOCK_ISSUE.number,
    ['- pre-release: none', EXPECTED_RELEASE_COMMENT.release].join('\n'),
  );

  const noRelease: ReleaseInfo = {
    prerelease: undefined,
    release: undefined,
  };

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, noRelease, false);

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

  await updateIssueCommentByRelease(
    mockGitHub,
    MOCK_ISSUE,
    prereleaseOnly,
    false,
  );

  expect(createIssueCommentMock).not.toHaveBeenCalled();
});

it('Adds an informational comment when no releases exist', async () => {
  getLastIssueCommentMock.mockResolvedValue('');

  const releaseInfo: ReleaseInfo = {
    prerelease: undefined,
    release: undefined,
  };

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, releaseInfo, true);

  expect(createIssueCommentMock).toHaveBeenCalledWith(
    mockGitHub,
    MOCK_ISSUE.number,
    [
      '> This comment and the `pending` label appear because release-tracking is enabled.',
      '> To disable, remove the `release-tracking` option or set it to `false`.',
      '\n',
      '- pre-release: none',
      '- release: none',
    ].join('\n'),
  );
});
