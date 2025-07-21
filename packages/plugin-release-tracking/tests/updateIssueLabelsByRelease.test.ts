import type { ReleaseInfo } from '../../core/src/git/getRelease';
import { GitHub } from '../../core/src/github/core';
import type { Issue } from '../../core/src/github/getOpenedIssues';
import * as SetIssueLabelsModule from '../../core/src/github/setIssueLabels';
import { updateIssueLabelsByRelease } from '../src/updateIssueLabelsByRelease';

import { beforeEach, expect, it, vi } from 'vitest';

const MOCK_RELEASE_TRACKING_LABELS = ['needs-release', 'in-next-release'];

// Mocking to avoid network requests
vi.mock('../../core/src/github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {},
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
    configuredLabels: [],
  })),
}));

vi.mock('../../core/src/github/setIssueLabels', () => ({
  setIssueLabels: vi.fn(),
}));

// Mock environment variables
vi.mock('../../../inputUtils', () => ({
  getMultilineInput: vi.fn((key: string, defaultValue: string[]) => {
    if (key === 'RELEASE_TRACKING_LABELS') {
      return MOCK_RELEASE_TRACKING_LABELS;
    }
    return defaultValue;
  }),
}));

const mockGitHub = new GitHub({} as any);

// Mocking for spy
const setIssueLabelsMock = vi.mocked(SetIssueLabelsModule.setIssueLabels);

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

  expect(setIssueLabelsMock).toHaveBeenCalledWith(
    mockGitHub,
    issueWithTrackingLabels.number,
    ['bug', 'enhancement'],
  );
});

it('For unreleased issues, release tracking labels should be added', async () => {
  const prereleaseOnly: ReleaseInfo = {
    prerelease: MOCK_RELEASE_INFO.prerelease,
    release: undefined,
  };

  await updateIssueLabelsByRelease(mockGitHub, MOCK_ISSUE, prereleaseOnly);

  expect(setIssueLabelsMock).toHaveBeenCalledWith(
    mockGitHub,
    MOCK_ISSUE.number,
    expect.arrayContaining([
      ...MOCK_ISSUE.labels,
      ...MOCK_RELEASE_TRACKING_LABELS,
    ]),
  );
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

  expect(setIssueLabelsMock).toHaveBeenCalledWith(
    mockGitHub,
    issueWithSomeTrackingLabels.number,
    expect.arrayContaining([
      ...issueWithSomeTrackingLabels.labels,
      MOCK_RELEASE_TRACKING_LABELS[1],
    ]),
  );
});

it('If release information is undefined, it should be treated as unreleased and labels should be added', async () => {
  const noReleaseInfo: ReleaseInfo = {
    prerelease: undefined,
    release: undefined,
  };

  await updateIssueLabelsByRelease(mockGitHub, MOCK_ISSUE, noReleaseInfo);

  expect(setIssueLabelsMock).toHaveBeenCalledWith(
    mockGitHub,
    MOCK_ISSUE.number,
    expect.arrayContaining([
      ...MOCK_ISSUE.labels,
      ...MOCK_RELEASE_TRACKING_LABELS,
    ]),
  );
});
