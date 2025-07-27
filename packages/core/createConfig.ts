import type { Config, RepoSpec } from './types/config';
import { unique } from './utils/common';
import { getSystemBooleanInput, getSystemInput, getSystemMultilineInput } from './utils/input';
import { log } from './utils/log';

import path from 'node:path';

export const defaults = {
  userName: 'github-actions',
  email: 'action@github.com',
  branch: 'main',
  label: 'sync',
} as const;

export const RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME =
  '@yuki-no/plugin-release-tracking@latest';

export const createConfig = (): Config => {
  log('I', 'createConfig :: Parsing configuration values');

  // Required values validation
  const accessToken = getSystemInput('ACCESS_TOKEN');
  const headRepo = getSystemInput('HEAD_REPO');
  const trackFrom = getSystemInput('TRACK_FROM');

  assert(!!accessToken, '`accessToken` is required.');
  assert(!!headRepo, '`headRepo` is required.');
  assert(!!trackFrom, '`trackFrom` is required.');

  // Optional values with defaults
  const userName = getSystemInput('USER_NAME', defaults.userName);
  const email = getSystemInput('EMAIL', defaults.email);
  const upstreamRepo = getSystemInput('UPSTREAM_REPO');
  const headRepoBranch = getSystemInput('HEAD_REPO_BRANCH', defaults.branch);

  const upstreamRepoSpec = createRepoSpec(
    upstreamRepo || inferUpstreamRepo(),
    defaults.branch,
  );
  const headRepoSpec = createRepoSpec(headRepo!, headRepoBranch!);

  const include = getSystemMultilineInput('INCLUDE');
  const exclude = getSystemMultilineInput('EXCLUDE');
  const labels = getSystemMultilineInput('LABELS', [defaults.label]);
  const sortedLabels = labels.sort();
  const plugins = getSystemMultilineInput('PLUGINS');
  const releaseTracking = getSystemBooleanInput('RELEASE_TRACKING');

  const verbose = getSystemBooleanInput('VERBOSE', true);
  process.env.VERBOSE = verbose.toString();

  // Compatibility layer: automatically add core plugin when release-tracking is enabled
  const finalPlugins = [...plugins];
  if (releaseTracking) {
    finalPlugins.push(RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME);
  }

  return {
    accessToken: accessToken!,
    userName: userName!,
    email: email!,
    upstreamRepoSpec,
    headRepoSpec,
    trackFrom: trackFrom!,
    include,
    exclude,
    labels: sortedLabels,
    releaseTracking,
    plugins: unique(finalPlugins),
    verbose,
  };
};

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const inferUpstreamRepo = (): string => {
  const serverUrl = getSystemInput('GITHUB_SERVER_URL', 'https://github.com');
  const repository = getSystemInput('GITHUB_REPOSITORY');

  if (!repository) {
    throw new Error(
      [
        'Failed to infer upstream repository: GITHUB_REPOSITORY environment variable is not set.',
        'This typically happens when running outside of GitHub Actions.',
        'For local development, please explicitly set the UPSTREAM_REPO environment variable.',
      ].join('\n'),
    );
  }

  return `${serverUrl}/${repository}.git`;
};

const createRepoSpec = (url: string, branch: string): RepoSpec => ({
  owner: extractRepoOwner(url),
  name: extractRepoName(url),
  branch,
});

const extractRepoOwner = (url: string): string => {
  let dirname = path.dirname(url);

  if (dirname.includes(':')) {
    dirname = dirname.split(':').pop()!;
  }

  return path.basename(dirname);
};

const extractRepoName = (url: string): string => path.basename(url, '.git');
