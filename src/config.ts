import { extractRepoOwner, extractRepoName, splitByNewline } from './utils';
import { defaults } from './defaults';

export interface UserConfig {
  /**
   * GitHub access token.
   *
   * Uses `process.env.ACCESS_TOKEN` if it exists.
   */
  accessToken: string;

  /**
   * Git user name to use when making issues and PRs.
   * Defaults to 'github-actions'.
   * Note: Using only one of username or email might cause GitHub Actions bot to work incorrectly.
   *
   * Uses `process.env.USER_NAME` if it exists.
   * @default 'github-actions'
   */
  userName?: string;

  /**
   * Git email address to use when making issues and PRs.
   * Defaults to 'action@github.com'.
   * Note: Using only one of username or email might cause GitHub Actions bot to work incorrectly.
   *
   * Uses `process.env.EMAIL` if it exists.
   * @default 'action@github.com'
   */
  email?: string;

  /**
   * The url for the upstream repo. This is the repository that you set up Yuki-no.
   * If not specified, the current repository will be used.
   *
   * Uses `process.env.UPSTREAM_REPO` if it exists.
   * If not provided, uses GitHub Actions environment variables.
   *
   * @example 'https://github.com/vitejs/docs-ko.git'
   */
  upstreamRepo?: string;

  /**
   * The head repo to track. This is the repository you want to take a diff.
   *
   * Uses `process.env.HEAD_REPO` if it exists.
   *
   * @example 'https://github.com/vitejs/vite.git'
   */
  headRepo: string;

  /**
   * The branch for the head repo.
   * Defaults to 'main'.
   *
   * Uses `process.env.HEAD_REPO_BRANCH` if it exists.
   *
   * @default 'main'
   */
  headRepoBranch?: string;

  /**
   * The git commit sha of head repo to start tracking.
   * Yuki-no will only track commit from this hash.
   *
   * Uses `process.env.TRACK_FROM` if it exists.
   *
   * @example '889d985125558731c14278c3c5764bdcfb2389fd'
   */
  trackFrom: string;

  /**
   * List of file patterns to track. Multiple patterns can be specified with newlines.
   * Files matching these Glob patterns will be included in tracking.
   * If empty, all files will be tracked.
   */
  include?: string;

  /**
   * List of file patterns to exclude from tracking. Multiple patterns can be specified with newlines.
   * Files matching these Glob patterns will be excluded from tracking.
   * When a file matches both include and exclude patterns, exclude takes precedence.
   */
  exclude?: string;

  /**
   * Labels to add to the issues. You can specify multiple labels
   * separated by newlines. Defaults to 'sync'.
   * If empty string is provided, no labels will be added.
   *
   * WARNING: Using these labels on non-translation Issues may cause unexpected behavior.
   *
   * Uses `process.env.LABELS` if it exists.
   *
   * @default 'sync'
   * @example |
   *   sync
   *   needs review
   *   my-label
   */
  labels?: string;

  /**
   * Whether to enable release tracking.
   * When enabled, Yuki-no will track releases for each issue and
   * add comments about release status.
   *
   * Uses `process.env.RELEASE_TRACKING` if it exists.
   * @default undefined
   */
  releaseTracking?: string;

  /**
   * Labels to add to issues when release tracking is enabled.
   * These labels will be added to issues that haven't been released yet
   * and removed when the changes are released.
   * You can specify multiple labels separated by newlines.
   * Defaults to 'pending'.
   * If empty string is provided, no labels will be added.
   * Any labels that overlap with the 'labels' option will be filtered out.
   *
   * WARNING: Using these labels on non-translation Issues may cause unexpected behavior.
   *
   * Uses `process.env.RELEASE_TRACKING_LABELS` if it exists.
   * Only used when release tracking is enabled.
   *
   * @default 'pending'
   * @example |
   *   pending
   *   unreleased
   */
  releaseTrackingLabels?: string;

  /**
   * Whether to enable verbose logging.
   * When enabled, Yuki-no will show all log messages including info and success messages.
   * This is useful for debugging.
   *
   * Uses `process.env.VERBOSE` if it exists.
   * @default true
   */
  verbose?: string;
}

export interface Config {
  userName: string;
  email: string;
  accessToken: string;
  trackFrom: string;
  include: string[];
  exclude: string[];
  labels: string[];
  releaseTracking: boolean;
  releaseTrackingLabels: string[];
  verbose: boolean;

  remote: {
    upstream: Remote;
    head: Remote;
  };
}

export interface Remote {
  url: string;
  owner: string;
  name: string;
  branch: string;
}

export function createConfig(config: UserConfig): Config {
  const upstreamRepo = config.upstreamRepo || inferUpstreamRepo();
  const labels = parseLabels(config.labels ?? defaults.label);
  const releaseTrackingLabels = filterReleaseTrackingLabels(
    labels,
    parseLabels(config.releaseTrackingLabels ?? defaults.releaseTrackingLabel),
  );

  return {
    userName: config.userName || defaults.userName,
    email: config.email || defaults.email,
    accessToken: config.accessToken,
    trackFrom: config.trackFrom,
    include: parsePatterns(config.include),
    exclude: parsePatterns(config.exclude),
    labels,
    releaseTracking: config.releaseTracking?.toLowerCase() === 'true',
    releaseTrackingLabels,
    verbose: config.verbose?.toLowerCase() === 'true',

    remote: {
      upstream: {
        url: upstreamRepo,
        owner: extractRepoOwner(upstreamRepo),
        name: extractRepoName(upstreamRepo),
        branch: defaults.branch,
      },
      head: {
        url: config.headRepo,
        owner: extractRepoOwner(config.headRepo),
        name: extractRepoName(config.headRepo),
        branch: config.headRepoBranch || defaults.branch,
      },
    },
  };
}

function inferUpstreamRepo(): string {
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const repository = process.env.GITHUB_REPOSITORY;

  if (!repository) {
    throw new Error(
      'Failed to infer upstream repository: GITHUB_REPOSITORY environment variable is not set.\n' +
        'This typically happens when running outside of GitHub Actions.\n' +
        'For local development, please explicitly set the UPSTREAM_REPO environment variable.',
    );
  }

  return `${serverUrl}/${repository}.git`;
}

function parseLabels(rawLabels: string): string[] {
  if (rawLabels === '') {
    return [];
  }

  return splitByNewline(rawLabels);
}

function filterReleaseTrackingLabels(
  labels: string[],
  releaseTrackingLabels: string[],
) {
  return releaseTrackingLabels.filter(
    releaseTrackingLabel => !labels.includes(releaseTrackingLabel),
  );
}

function parsePatterns(patterns?: string): string[] {
  if (!patterns) {
    return [];
  }

  return splitByNewline(patterns);
}
