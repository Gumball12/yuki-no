import type { ReleaseInfo } from '../utils/getRelease';
import { updateIssueLabelsByRelease } from '../utils/updateIssueLabelsByRelease';

import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { Issue } from '@yuki-no/plugin-sdk/types/github';
import { beforeEach, expect, it, vi } from 'vitest';

const MOCK_RELEASE_TRACKING_LABELS = ['needs-release', 'in-next-release'];

// Mock GitHub API methods
const setIssueLabelsMock = vi.fn();

// Mocking to avoid network requests
vi.mock('@yuki-no/plugin-sdk/infra/github', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {
      issues: {
        setLabels: setIssueLabelsMock,
      },
    },
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
    configuredLabels: [],
  })),
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

vi.mock('@yuki-no/plugin-sdk/utils/common', () => ({
  unique: vi.fn((arr: string[]) => [...new Set(arr)]),
}));

const mockGitHub = new GitHub({} as any);

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

beforeEach(() => {
  vi.clearAllMocks();
});

it('For released issues, release tracking labels should be removed', async () => {
  const issueWithTrackingLabels: Issue = {
    ...MOCK_ISSUE,
    labels: ['bug', 'enhancement', ...MOCK_RELEASE_TRACKING_LABELS],
  };

  await updateIssueLabelsByRelease(
    mockGitHub,
    issueWithTrackingLabels,
    MOCK_RELEASE_INFO,
  );

  expect(setIssueLabelsMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    issue_number: issueWithTrackingLabels.number,
    labels: ['bug', 'enhancement'],
  });
});

it('For unreleased issues, release tracking labels should be added', async () => {
  const prereleaseOnly: ReleaseInfo = {
    prerelease: MOCK_RELEASE_INFO.prerelease,
    release: undefined,
  };

  await updateIssueLabelsByRelease(mockGitHub, MOCK_ISSUE, prereleaseOnly);

  expect(setIssueLabelsMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    issue_number: MOCK_ISSUE.number,
    labels: expect.arrayContaining([
      ...MOCK_ISSUE.labels,
      ...MOCK_RELEASE_TRACKING_LABELS,
    ]),
  });
});

it('For unreleased issues, if all release tracking labels are already present, no changes should be made', async () => {
  const issueWithAllTrackingLabels: Issue = {
    ...MOCK_ISSUE,
    labels: [...MOCK_ISSUE.labels, ...MOCK_RELEASE_TRACKING_LABELS].sort(),
  };

  const prereleaseOnly: ReleaseInfo = {
    prerelease: MOCK_RELEASE_INFO.prerelease,
    release: undefined,
  };

  await updateIssueLabelsByRelease(
    mockGitHub,
    issueWithAllTrackingLabels,
    prereleaseOnly,
  );

  expect(setIssueLabelsMock).not.toHaveBeenCalled();
});

it('For unreleased issues, if only some release tracking labels are present, the remaining labels should be added', async () => {
  const issueWithSomeTrackingLabels: Issue = {
    ...MOCK_ISSUE,
    labels: [...MOCK_ISSUE.labels, MOCK_RELEASE_TRACKING_LABELS[0]],
  };

  const prereleaseOnly: ReleaseInfo = {
    prerelease: MOCK_RELEASE_INFO.prerelease,
    release: undefined,
  };

  await updateIssueLabelsByRelease(
    mockGitHub,
    issueWithSomeTrackingLabels,
    prereleaseOnly,
  );

  expect(setIssueLabelsMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    issue_number: issueWithSomeTrackingLabels.number,
    labels: expect.arrayContaining([
      ...issueWithSomeTrackingLabels.labels,
      MOCK_RELEASE_TRACKING_LABELS[1],
    ]),
  });
});

it('If release information is undefined, it should be treated as unreleased and labels should be added', async () => {
  const noReleaseInfo: ReleaseInfo = {
    prerelease: undefined,
    release: undefined,
  };

  await updateIssueLabelsByRelease(mockGitHub, MOCK_ISSUE, noReleaseInfo);

  expect(setIssueLabelsMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    issue_number: MOCK_ISSUE.number,
    labels: expect.arrayContaining([
      ...MOCK_ISSUE.labels,
      ...MOCK_RELEASE_TRACKING_LABELS,
    ]),
  });
});
