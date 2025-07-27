import type { Config, RepoSpec } from './types/config';
import { unique } from './utils/common';
import { getBooleanInput, getInput, getMultilineInput } from './utils/input';
import { log } from './utils/log';

import path from 'node:path';

export const defaults = {
  userName: 'github-actions',
  email: 'action@github.com',
  branch: 'main',
  label: 'sync',
} as const;


export const createConfig = (): Config => {
  log('I', 'createConfig :: Parsing configuration values');

  // Required values validation
  const accessToken = getInput('ACCESS_TOKEN');
  const headRepo = getInput('HEAD_REPO');
  const trackFrom = getInput('TRACK_FROM');

  assert(!!accessToken, '`accessToken` is required.');
  assert(!!headRepo, '`headRepo` is required.');
  assert(!!trackFrom, '`trackFrom` is required.');

  // Optional values with defaults
  const userName = getInput('USER_NAME', defaults.userName);
  const email = getInput('EMAIL', defaults.email);
  const upstreamRepo = getInput('UPSTREAM_REPO');
  const headRepoBranch = getInput('HEAD_REPO_BRANCH', defaults.branch);

  const upstreamRepoSpec = createRepoSpec(
    upstreamRepo || inferUpstreamRepo(),
    defaults.branch,
  );
  const headRepoSpec = createRepoSpec(headRepo!, headRepoBranch!);

  const include = getMultilineInput('INCLUDE');
  const exclude = getMultilineInput('EXCLUDE');
  const labels = getMultilineInput('LABELS', [defaults.label]);
  const sortedLabels = labels.sort();
  const plugins = getMultilineInput('PLUGINS');
  const releaseTracking = getBooleanInput('RELEASE_TRACKING');

  const verbose = getBooleanInput('VERBOSE', true);
  process.env.VERBOSE = verbose.toString();

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
    plugins,
    verbose,
  };
};

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const inferUpstreamRepo = (): string => {
  const serverUrl = getInput('GITHUB_SERVER_URL', 'https://github.com');
  const repository = getInput('GITHUB_REPOSITORY');

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
