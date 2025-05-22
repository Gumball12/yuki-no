// @vitest-environment node
import ReleaseTrackerPlugin from '../../../plugins/core/release-tracker';
import { type Config } from '../../../createConfig';
import { type Git } from '../../../git/core';
import { type GitHub } from '../../../github/core';
import { type Issue } from '../../../github/getOpenedIssues';
import { type ReleaseInfo } from '../../../git/getRelease';

// Mock dependencies
vi.mock('../../../git/getRelease');
vi.mock('../../../git/hasAnyRelease');
vi.mock('../../../plugins/core/release-tracker/lib/updateIssueLabelsByRelease');
vi.mock('../../../plugins/core/release-tracker/lib/updateIssueCommentsByRelease');
vi.mock('../../../utils'); // For log

import { getRelease } from '../../../git/getRelease';
import { hasAnyRelease } from '../../../git/hasAnyRelease';
import { updateIssueLabelsByRelease } from '../../../plugins/core/release-tracker/lib/updateIssueLabelsByRelease';
import { updateIssueCommentByRelease } from '../../../plugins/core/release-tracker/lib/updateIssueCommentsByRelease';
import { log } from '../../../utils';

describe('Core Plugin: ReleaseTrackerPlugin - onReleaseTracking', () => {
  const mockConfig = {
    // ... necessary config properties
    releaseTrackingLabels: ['pending', 'needs-release'],
  } as unknown as Config;

  const mockGit = {} as Git;
  const mockGithub = { config: mockConfig } as GitHub; // Mock GitHub to include config for default labels

  const mockIssues: Issue[] = [
    { hash: 'c1', number: 1, title: 'Issue 1', labels: ['sync'], body: '', state: 'open', html_url: '' },
    { hash: 'c2', number: 2, title: 'Issue 2', labels: ['sync', 'pending'], body: '', state: 'open', html_url: '' },
  ];

  const mockReleaseInfoC1: ReleaseInfo = { prerelease: undefined, release: { version: 'v1.0.0', url: '' } };
  const mockReleaseInfoC2: ReleaseInfo = { prerelease: { version: 'v1.1.0-beta.1', url: '' }, release: undefined };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock implementations
    vi.mocked(getRelease).mockImplementation((_git, hash) => {
      if (hash === 'c1') return mockReleaseInfoC1;
      if (hash === 'c2') return mockReleaseInfoC2;
      return { prerelease: undefined, release: undefined };
    });
    vi.mocked(hasAnyRelease).mockReturnValue(true);
    vi.mocked(updateIssueLabelsByRelease).mockResolvedValue();
    vi.mocked(updateIssueCommentByRelease).mockResolvedValue();
  });

  it('should call dependencies to update labels and comments for each issue', async () => {
    const pluginOptions = { customOption: 'testValueForRelease' };
    await ReleaseTrackerPlugin.onReleaseTracking!(mockConfig, mockGit, mockGithub, mockIssues, pluginOptions);

    expect(getRelease).toHaveBeenCalledTimes(mockIssues.length);
    expect(getRelease).toHaveBeenCalledWith(mockGit, 'c1');
    expect(getRelease).toHaveBeenCalledWith(mockGit, 'c2');
    expect(hasAnyRelease).toHaveBeenCalledWith(mockGit);

    expect(updateIssueLabelsByRelease).toHaveBeenCalledTimes(mockIssues.length);
    expect(updateIssueLabelsByRelease).toHaveBeenCalledWith(mockGithub, mockIssues[0], mockReleaseInfoC1, pluginOptions);
    expect(updateIssueLabelsByRelease).toHaveBeenCalledWith(mockGithub, mockIssues[1], mockReleaseInfoC2, pluginOptions);

    expect(updateIssueCommentByRelease).toHaveBeenCalledTimes(mockIssues.length);
    expect(updateIssueCommentByRelease).toHaveBeenCalledWith(mockGithub, mockIssues[0], mockReleaseInfoC1, true, pluginOptions);
    expect(updateIssueCommentByRelease).toHaveBeenCalledWith(mockGithub, mockIssues[1], mockReleaseInfoC2, true, pluginOptions);

    expect(log).toHaveBeenCalledWith('I', 'core:release-tracker :: Release tracking started', pluginOptions);
    expect(log).toHaveBeenCalledWith('S', `core:release-tracker :: Release information updated for ${mockIssues.length} issues`);
  });

  it('should correctly pass plugin options to helpers for label handling', async () => {
    const specificOptions = { releaseTrackingLabels: ['custom-pending'] };
    // The mockGithub.config.releaseTrackingLabels will be used by helpers if options.releaseTrackingLabels is undefined in helper
    // but if options.releaseTrackingLabels is passed, it should take precedence.
    // Our mocks for updateIssueLabelsByRelease & updateIssueCommentByRelease don't currently use the options
    // for label selection logic, but we test they are passed.
    // The actual helper functions were updated to use options.releaseTrackingLabels.

    await ReleaseTrackerPlugin.onReleaseTracking!(mockConfig, mockGit, mockGithub, mockIssues, specificOptions);

    expect(updateIssueLabelsByRelease).toHaveBeenCalledWith(mockGithub, mockIssues[0], mockReleaseInfoC1, specificOptions);
    expect(updateIssueCommentByRelease).toHaveBeenCalledWith(mockGithub, mockIssues[0], mockReleaseInfoC1, true, specificOptions);
  });

   it('handles case where no issues are provided', async () => {
    await ReleaseTrackerPlugin.onReleaseTracking!(mockConfig, mockGit, mockGithub, [], {});
    expect(getRelease).not.toHaveBeenCalled();
    expect(updateIssueLabelsByRelease).not.toHaveBeenCalled();
    expect(updateIssueCommentByRelease).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('S', `core:release-tracker :: Release information updated for 0 issues`);
  });
});
