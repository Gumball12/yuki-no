import { getBooleanInput, getMultilineInput } from './inputUtils';
import { assert, excludeFrom, log } from './utils';

import path from 'node:path';

type RawConfig = Readonly<{
  accessToken: string;
  userName?: string;
  email?: string;
  upstreamRepo?: string;
  headRepo: string;
  headRepoBranch?: string;
  trackFrom: string;
  include?: string;
  exclude?: string;
  labels?: string;
  releaseTracking?: string;
  releaseTrackingLabels?: string;
  plugins?: string;
  verbose?: string;
}>;

export type Config = Readonly<{
  accessToken: string;
  userName: string;
  email: string;
  upstreamRepoSpec: RepoSpec;
  headRepoSpec: RepoSpec;
  trackFrom: string;
  include: string[];
  exclude: string[];
  labels: string[];
  releaseTracking: boolean;
  releaseTrackingLabels: string[];
  plugins: string[];
  verbose: boolean;
}>;

export type RepoSpec = {
  owner: string;
  name: string;
  branch: string;
};

export const defaults = {
  userName: 'github-actions',
  email: 'action@github.com',
  branch: 'main',
  label: 'sync',
  releaseTrackingLabel: 'pending',
} as const;

export const createConfig = (): Config => {
  log('I', 'createConfig :: Parsing configuration values');

  const rawConfig = createRawConfig();

  const accessToken = rawConfig.accessToken;
  const userName = rawConfig.userName || defaults.userName;
  const email = rawConfig.email || defaults.email;

  const upstreamRepoSpec = createRepoSpec(
    rawConfig.upstreamRepo || inferUpstreamRepo(),
    defaults.branch,
  );
  const headRepoSpec = createRepoSpec(
    rawConfig.headRepo,
    rawConfig.headRepoBranch || defaults.branch,
  );
  const trackFrom = rawConfig.trackFrom;

  const include = getMultilineInput(rawConfig, 'include');
  const exclude = getMultilineInput(rawConfig, 'exclude');

  const labels = getMultilineInput(rawConfig, 'labels');
  const sortedLabels = (labels.length ? labels : [defaults.label]).sort();

  const plugins = getMultilineInput(rawConfig, 'plugins');

  const releaseTracking = getBooleanInput(rawConfig, 'releaseTracking');
  const rawReleaseLabels = getMultilineInput(
    rawConfig,
    'releaseTrackingLabels',
  );
  const releaseTrackingLabels = excludeFrom(
    rawReleaseLabels.length
      ? rawReleaseLabels
      : [defaults.releaseTrackingLabel],
    sortedLabels,
  );

  const verbose = getBooleanInput(rawConfig, 'verbose');

  return {
    accessToken,
    userName,
    email,
    upstreamRepoSpec,
    headRepoSpec,
    trackFrom,
    include,
    exclude,
    labels: sortedLabels,
    releaseTracking,
    releaseTrackingLabels,
    plugins,
    verbose,
  };
};

const createRawConfig = (): RawConfig => {
  assert(!!process.env.ACCESS_TOKEN, '`accessToken` is required.');
  assert(!!process.env.HEAD_REPO, '`headRepo` is required.');
  assert(!!process.env.TRACK_FROM, '`trackFrom` is required.');

  return {
    accessToken: process.env.ACCESS_TOKEN!,
    userName: process.env.USER_NAME,
    email: process.env.EMAIL,
    upstreamRepo: process.env.UPSTREAM_REPO,
    headRepo: process.env.HEAD_REPO!,
    headRepoBranch: process.env.HEAD_REPO_BRANCH,
    trackFrom: process.env.TRACK_FROM!,
    include: process.env.INCLUDE,
    exclude: process.env.EXCLUDE,
    labels: process.env.LABELS,
    releaseTracking: process.env.RELEASE_TRACKING,
    releaseTrackingLabels: process.env.RELEASE_TRACKING_LABELS,
    plugins: process.env.PLUGINS,
    verbose: process.env.VERBOSE,
  };
};

export const inferUpstreamRepo = (): string => {
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const repository = process.env.GITHUB_REPOSITORY;

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
