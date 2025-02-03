import { extractRepoOwner, extractRepoName } from './utils';
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
   * The url for the upstream repo. This is the repository that you set up Ryu-Cho.
   *
   * Uses `process.env.UPSTREAM_REPO` if it exists.
   *
   * @example 'https://github.com/vitejs/docs-ko.git'
   */
  upstreamRepo: string;

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
   * Ryu-Cho will only track commit from this hash.
   *
   * Uses `process.env.TRACK_FROM` if it exists.
   *
   * @example '889d985125558731c14278c3c5764bdcfb2389fd'
   */
  trackFrom: string;

  /**
   * File path to track. If specified, Ryu-Cho will only track commits that
   * modified files under this path. If not specified, it will track all files
   * in the project root.
   *
   * @example 'docs/'
   */
  pathStartsWith?: string;

  /**
   * Labels to add to the issues. You can specify multiple labels
   * separated by newlines. Defaults to 'sync'.
   * If empty string is provided, no labels will be added.
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
}

export interface Config {
  userName: string;
  email: string;
  accessToken: string;
  trackFrom: string;
  pathStartsWith?: string;
  labels?: string;

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
  return {
    userName: config.userName ?? defaults.userName,
    email: config.email ?? defaults.email,
    accessToken: config.accessToken,
    trackFrom: config.trackFrom,
    pathStartsWith: config.pathStartsWith,
    labels: config.labels,

    remote: {
      upstream: {
        url: config.upstreamRepo,
        owner: extractRepoOwner(config.upstreamRepo),
        name: extractRepoName(config.upstreamRepo),
        branch: defaults.branch,
      },
      head: {
        url: config.headRepo,
        owner: extractRepoOwner(config.headRepo),
        name: extractRepoName(config.headRepo),
        branch: config.headRepoBranch ?? defaults.branch,
      },
    },
  };
}
