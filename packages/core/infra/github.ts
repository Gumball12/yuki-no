import type { Config, RepoSpec } from '../types/config';
import { log } from '../utils/log';

import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';
import { Octokit } from '@octokit/rest';

type GitHubConfig = Pick<Config, 'accessToken' | 'labels'> & {
  repoSpec: RepoSpec;
};

const ThrottledOctokit = Octokit.plugin(retry, throttling);

export class GitHub {
  api: Octokit;

  constructor(private readonly config: GitHubConfig) {
    log(
      'I',
      `GitHub[[Construct]] :: Initializing GitHub API client (${this.config.repoSpec.owner}/${this.config.repoSpec.name})`,
    );

    /**
     * Retry policy:
     * - Retry network errors up to 3 times
     * - Wait 5 seconds between retries
     * - Allow retries for all status codes
     *
     * Rate limit handling:
     * - If hitting hourly limit (3600+ seconds), fail immediately
     * - For shorter rate limits, retry only once
     *
     * Secondary rate limit (GitHub API abuse detection) handling:
     * - Retry up to 3 times
     */
    this.api = new ThrottledOctokit({
      auth: config.accessToken,
      retry: {
        doNotRetry: [],
        retries: 3,
        retryAfter: 10, // sec
      },
      throttle: {
        onRateLimit: (retryAfter, options) => {
          log(
            'W',
            `GitHub API Rate Limit reached (waiting ${retryAfter} seconds)`,
          );

          if (retryAfter >= 3600) {
            log(
              'E',
              'GitHub API hourly request limit (5,000 requests) exceeded, failure without retry',
            );
            return false;
          }

          if (options.request.retryCount < 1) {
            log(
              'W',
              `GitHub API Rate Limit: Retry after ${retryAfter} seconds (attempt 1)`,
            );
            return true;
          }

          log('E', 'GitHub API Rate Limit: Maximum retry count exceeded');
          return false;
        },
        onSecondaryRateLimit: (retryAfter, options) => {
          log(
            'W',
            `GitHub API Secondary Rate Limit reached (waiting ${retryAfter} seconds)`,
          );

          if (options.request.retryCount < 3) {
            log(
              'W',
              `GitHub API Secondary Rate Limit: Retry after ${retryAfter} seconds (${options.request.retryCount + 1}/3)`,
            );
            return true;
          }

          log(
            'E',
            'GitHub API Secondary Rate Limit: Maximum retry count exceeded',
          );
          return false;
        },
      },
    });
  }

  get ownerAndRepo(): { owner: string; repo: string } {
    return {
      owner: this.config.repoSpec.owner,
      repo: this.config.repoSpec.name,
    };
  }

  get repoSpec(): RepoSpec {
    return this.config.repoSpec;
  }

  get configuredLabels(): string[] {
    return this.config.labels;
  }
}
