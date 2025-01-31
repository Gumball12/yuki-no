import { extractRepoOwner, extractRepoName } from './utils'

export interface UserConfig {
  /**
   * Git user name to use when making changes.
   */
  userName: string

  /**
   * Git email address to use when making changes.
   */
  email: string

  /**
   * GitHub access token.
   */
  accessToken: string

  /**
   * Repository where issues will be created.
   *
   * @example 'https://github.com/vitejs/docs-ko.git'
   */
  headRepo: string

  /**
   * Source repository to track changes from.
   *
   * @example 'https://github.com/vitejs/vite.git'
   */
  upstreamRepo: string

  /**
   * Source repository's branch.
   *
   * @default 'main'
   */
  upstreamRepoBranch?: string

  /**
   * File path to track. If this option is set, commit not containing the
   * path will be not tracked.
   *
   * @example 'docs/'
   */
  pathStartsWith?: string

  /**
   * The initial commit hash to start syncing from.
   * This is required to prevent syncing all historical commits.
   */
  initialCommit: string
}

export interface Config {
  userName: string
  email: string
  accessToken: string
  pathStartsWith?: string
  initialCommit: string

  remote: {
    upstream: Remote
    head: Remote
  }
}

export interface Remote {
  url: string
  owner: string
  name: string
  branch: string
}

export function createConfig(config: UserConfig): Config {
  return {
    userName: config.userName,
    email: config.email,
    accessToken: config.accessToken,
    pathStartsWith: config.pathStartsWith,
    initialCommit: config.initialCommit,

    remote: {
      upstream: {
        url: config.upstreamRepo,
        owner: extractRepoOwner(config.upstreamRepo),
        name: extractRepoName(config.upstreamRepo),
        branch: config.upstreamRepoBranch ?? 'main'
      },
      head: {
        url: config.headRepo,
        owner: extractRepoOwner(config.headRepo),
        name: extractRepoName(config.headRepo),
        branch: 'main'
      }
    }
  }
}
