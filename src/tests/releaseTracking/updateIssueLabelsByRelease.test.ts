import type { Config } from '../../createConfig';
import type { ReleaseInfo } from '../../git/getRelease';
import { GitHub } from '../../github/core';
import type { Issue } from '../../github/getOpenedIssues';
import * as SetIssueLabelsModule from '../../github/setIssueLabels';
import { updateIssueLabelsByRelease } from '../../releaseTracking/updateIssueLabelsByRelease';

import { beforeEach, expect, it, vi } from 'vitest';

// Mocking to avoid network requests
vi.mock('../../github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {},
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
  })),
}));

vi.mock('../../github/setIssueLabels', () => ({
  setIssueLabels: vi.fn(),
}));

const mockGitHub = new GitHub({} as any);

// Mocking for spy
const setIssueLabelsMock = vi.mocked(SetIssueLabelsModule.setIssueLabels);

const MOCK_RELEASE_TRACKING_LABELS = ['needs-release', 'in-next-release'];
const MOCK_CONFIG: Pick<Config, 'releaseTrackingLabels'> = {
  releaseTrackingLabels: MOCK_RELEASE_TRACKING_LABELS,
};

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
    MOCK_CONFIG,
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

  await updateIssueLabelsByRelease(
    mockGitHub,
    MOCK_CONFIG,
    MOCK_ISSUE,
    prereleaseOnly,
  );

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
    MOCK_CONFIG,
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
    MOCK_CONFIG,
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

  await updateIssueLabelsByRelease(
    mockGitHub,
    MOCK_CONFIG,
    MOCK_ISSUE,
    noReleaseInfo,
  );

  expect(setIssueLabelsMock).toHaveBeenCalledWith(
    mockGitHub,
    MOCK_ISSUE.number,
    expect.arrayContaining([
      ...MOCK_ISSUE.labels,
      ...MOCK_RELEASE_TRACKING_LABELS,
    ]),
  );
});
