import { excludeFrom, log, splitByNewline } from './utils';
import { parseEnv } from './validation/env';

import path from 'node:path';

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
  verbose: boolean;
  maybeFirstRun: boolean;
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

  const env = parseEnv(process.env);

  const accessToken = env.ACCESS_TOKEN;
  const userName = env.USER_NAME || defaults.userName;
  const email = env.EMAIL || defaults.email;

  const upstreamRepoSpec = createRepoSpec(
    env.UPSTREAM_REPO || inferUpstreamRepo(),
    defaults.branch,
  );
  const headRepoSpec = createRepoSpec(
    env.HEAD_REPO,
    env.HEAD_REPO_BRANCH || defaults.branch,
  );
  const trackFrom = env.TRACK_FROM;

  const include = splitByNewline(env.INCLUDE);
  const exclude = splitByNewline(env.EXCLUDE);
  const labels = splitByNewline(env.LABELS ?? defaults.label).sort();

  const releaseTracking = env.RELEASE_TRACKING?.toLowerCase() === 'true';
  const releaseTrackingLabels = excludeFrom(
    splitByNewline(
      env.RELEASE_TRACKING_LABELS ?? defaults.releaseTrackingLabel,
    ),
    labels,
  );

  const verbose = env.VERBOSE?.toLowerCase() === 'true';
  const maybeFirstRun = env.MAYBE_FIRST_RUN?.toLowerCase() === 'true';

  return {
    accessToken,
    userName,
    email,
    upstreamRepoSpec,
    headRepoSpec,
    trackFrom,
    include,
    exclude,
    labels,
    releaseTracking,
    releaseTrackingLabels,
    verbose,
    maybeFirstRun,
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
