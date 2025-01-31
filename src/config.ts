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
   * The url for the upstream repo.
   *
   * @example 'git@github.com:vuejs/vuejs.org'
   */
  upstreamRepo: string

  /**
   * The branch to track on the upstream repo.
   *
   * @default 'main'
   */
  upstreamRepoBranch?: string

  /**
   * The url for the head repo.
   *
   * @example 'https://github.com/vuejs/vuejs.org'
   */
  headRepo: string

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
