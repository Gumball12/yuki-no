import { describe, it, expect } from 'vitest'
import { createConfig } from '../src/config'
import type { UserConfig } from '../src/config'

describe('config', () => {
  describe('createConfig', () => {
    it('should create config with all required fields', () => {
      const userConfig: UserConfig = {
        userName: 'test-user',
        email: 'test@example.com',
        accessToken: 'test-token',
        upstreamRepo: 'https://github.com/test/upstream.git',
        headRepo: 'https://github.com/test/head.git',
        initialCommit: 'test-hash'
      }

      const config = createConfig(userConfig)

      expect(config).toEqual({
        userName: 'test-user',
        email: 'test@example.com',
        accessToken: 'test-token',
        initialCommit: 'test-hash',
        remote: {
          upstream: {
            url: 'https://github.com/test/upstream.git',
            owner: 'test',
            name: 'upstream',
            branch: 'main'
          },
          head: {
            url: 'https://github.com/test/head.git',
            owner: 'test',
            name: 'head',
            branch: 'main'
          }
        }
      })
    })

    it('should create config with optional fields', () => {
      const userConfig: UserConfig = {
        userName: 'test-user',
        email: 'test@example.com',
        accessToken: 'test-token',
        upstreamRepo: 'https://github.com/test/upstream.git',
        upstreamRepoBranch: 'develop',
        headRepo: 'https://github.com/test/head.git',
        pathStartsWith: 'docs/',
        initialCommit: 'test-hash'
      }

      const config = createConfig(userConfig)

      expect(config).toEqual({
        userName: 'test-user',
        email: 'test@example.com',
        accessToken: 'test-token',
        pathStartsWith: 'docs/',
        initialCommit: 'test-hash',
        remote: {
          upstream: {
            url: 'https://github.com/test/upstream.git',
            owner: 'test',
            name: 'upstream',
            branch: 'develop'
          },
          head: {
            url: 'https://github.com/test/head.git',
            owner: 'test',
            name: 'head',
            branch: 'main'
          }
        }
      })
    })

    it('should handle SSH URLs correctly', () => {
      const userConfig: UserConfig = {
        userName: 'test-user',
        email: 'test@example.com',
        accessToken: 'test-token',
        upstreamRepo: 'git@github.com:test/upstream.git',
        headRepo: 'git@github.com:test/head.git',
        initialCommit: 'test-hash'
      }

      const config = createConfig(userConfig)

      expect(config.remote.upstream.owner).toBe('test')
      expect(config.remote.upstream.name).toBe('upstream')
      expect(config.remote.head.owner).toBe('test')
      expect(config.remote.head.name).toBe('head')
    })
  })
})
