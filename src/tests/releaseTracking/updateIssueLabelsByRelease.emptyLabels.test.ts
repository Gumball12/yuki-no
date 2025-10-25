import type { ReleaseInfo } from '../../git/getRelease';
import { GitHub } from '../../github/core';
import type { Issue } from '../../github/getOpenedIssues';
import * as SetIssueLabelsModule from '../../github/setIssueLabels';
import { updateIssueLabelsByRelease } from '../../releaseTracking/updateIssueLabelsByRelease';

import { beforeEach, expect, it, vi } from 'vitest';

// Provide an empty releaseTrackingLabels configuration for this test module
vi.mock('../../github/core', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    api: {},
    ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
    releaseTrackingLabels: [],
  })),
}));

vi.mock('../../github/setIssueLabels', () => ({
  setIssueLabels: vi.fn(),
}));

const mockGitHub = new GitHub({} as any);
const setIssueLabelsMock = vi.mocked(SetIssueLabelsModule.setIssueLabels);

const ISSUE: Issue = {
  number: 10,
  body: 'body',
  labels: ['sync'],
  hash: 'abc1234',
  isoDate: '2023-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

it('When releaseTrackingLabels is empty, unreleased issues should not trigger label updates', async () => {
  const unreleased: ReleaseInfo = { prerelease: undefined, release: undefined };

  await updateIssueLabelsByRelease(mockGitHub, ISSUE, unreleased);

  expect(setIssueLabelsMock).not.toHaveBeenCalled();
});
