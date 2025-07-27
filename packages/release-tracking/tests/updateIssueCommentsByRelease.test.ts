import { getLastIssueComment } from '../utils/getLastIssueComments';
import type { ReleaseInfo } from '../utils/getRelease';
import { updateIssueCommentByRelease } from '../utils/updateIssueCommentsByRelease';

import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { Issue } from '@yuki-no/plugin-sdk/types/github';
import { beforeEach, expect, it, vi } from 'vitest';

const MOCK_RELEASE_TRACKING_LABELS = ['pending'];

// Mock GitHub API methods
const createIssueCommentMock = vi.fn();

// Mocking to bypass network requests
vi.mock('@yuki-no/plugin-sdk/infra/github', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {
      issues: {
        createComment: createIssueCommentMock,
      },
    },
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
    configuredLabels: [],
  })),
}));

vi.mock('../utils/getLastIssueComments', () => ({
  getLastIssueComment: vi.fn(),
}));

// Mock environment variables
vi.mock('@yuki-no/plugin-sdk/utils/input', () => ({
  getMultilineInput: vi.fn((key: string, defaultValue: string[]) => {
    if (key === 'YUKI_NO_RELEASE_TRACKING_LABELS') {
      return MOCK_RELEASE_TRACKING_LABELS;
    }
    return defaultValue;
  }),
}));

const mockGitHub = new GitHub({} as any);

const getLastIssueCommentMock = vi.mocked(getLastIssueComment);

const MOCK_ISSUE: Issue = {
  number: 123,
  body: 'Issue body',
  labels: ['bug', 'enhancement'],
  hash: 'abc123',
  isoDate: '2023-01-01T12:00:00Z',
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
    true,
  );

  expect(createIssueCommentMock).not.toHaveBeenCalled();
});

it('Should handle release comment without version prefix', async () => {
  getLastIssueCommentMock.mockResolvedValue(
    '- release: [0.9.0](https://github.com/...)',
  );

  await updateIssueCommentByRelease(
    mockGitHub,
    MOCK_ISSUE,
    MOCK_RELEASE_INFO,
    true,
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
    true,
  );

  expect(createIssueCommentMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    issue_number: MOCK_ISSUE.number,
    body: [EXPECTED_RELEASE_COMMENT.prerelease, '- release: none'].join('\n'),
  });

  const releaseOnly: ReleaseInfo = {
    prerelease: undefined,
    release: {
      version: 'v1.0.0',
      url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.0',
    },
  };

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, releaseOnly, true);

  expect(createIssueCommentMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    issue_number: MOCK_ISSUE.number,
    body: ['- pre-release: none', EXPECTED_RELEASE_COMMENT.release].join('\n'),
  });

  const noRelease: ReleaseInfo = {
    prerelease: undefined,
    release: undefined,
  };

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, noRelease, true);

  expect(createIssueCommentMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    issue_number: MOCK_ISSUE.number,
    body: '- pre-release: none\n- release: none',
  });
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
    true,
  );

  expect(createIssueCommentMock).not.toHaveBeenCalled();
});

it('Adds an informational comment when no releases exist', async () => {
  getLastIssueCommentMock.mockResolvedValue('');

  const releaseInfo: ReleaseInfo = {
    prerelease: undefined,
    release: undefined,
  };

  await updateIssueCommentByRelease(mockGitHub, MOCK_ISSUE, releaseInfo, false);

  expect(createIssueCommentMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    issue_number: MOCK_ISSUE.number,
    body: [
      '> This comment and the `pending` label appear because release-tracking is enabled.',
      '> To disable, remove `release-tracking` from the plugins list.',
      '\n',
      '- pre-release: none',
      '- release: none',
    ].join('\n'),
  });
});
