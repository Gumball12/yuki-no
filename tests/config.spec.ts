import { describe, it, expect } from 'vitest';
import { createConfig } from '../src/config';
import type { UserConfig } from '../src/config';

describe('config', () => {
  describe('createConfig', () => {
    it('should create config with only required fields', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        upstreamRepo: 'https://github.com/test/upstream.git',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
      };

      const config = createConfig(userConfig);

      expect(config).toEqual({
        userName: 'github-actions',
        email: 'action@github.com',
        accessToken: 'test-token',
        trackFrom: 'test-hash',
        pathStartsWith: undefined,
        labels: undefined,
        releaseTracking: false,
        remote: {
          upstream: {
            url: 'https://github.com/test/upstream.git',
            owner: 'test',
            name: 'upstream',
            branch: 'main',
          },
          head: {
            url: 'https://github.com/test/head.git',
            owner: 'test',
            name: 'head',
            branch: 'main',
          },
        },
      });
    });

    it('should create config with all optional fields', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        userName: 'test-user',
        email: 'test@example.com',
        upstreamRepo: 'https://github.com/test/upstream.git',
        headRepo: 'https://github.com/test/head.git',
        headRepoBranch: 'develop',
        trackFrom: 'test-hash',
        pathStartsWith: 'docs/',
        labels: 'test\nmy\nlabel',
        releaseTracking: 'true',
      };

      const config = createConfig(userConfig);

      expect(config).toEqual({
        userName: 'test-user',
        email: 'test@example.com',
        accessToken: 'test-token',
        trackFrom: 'test-hash',
        pathStartsWith: 'docs/',
        labels: 'test\nmy\nlabel',
        releaseTracking: true,
        remote: {
          upstream: {
            url: 'https://github.com/test/upstream.git',
            owner: 'test',
            name: 'upstream',
            branch: 'main',
          },
          head: {
            url: 'https://github.com/test/head.git',
            owner: 'test',
            name: 'head',
            branch: 'develop',
          },
        },
      });
    });

    it('should handle SSH URLs correctly', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        upstreamRepo: 'git@github.com:test/upstream.git',
        headRepo: 'git@github.com:test/head.git',
        trackFrom: 'test-hash',
      };

      const config = createConfig(userConfig);

      expect(config.remote.upstream.owner).toBe('test');
      expect(config.remote.upstream.name).toBe('upstream');
      expect(config.remote.head.owner).toBe('test');
      expect(config.remote.head.name).toBe('head');
    });

    it('should use default values for optional fields when not provided', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        upstreamRepo: 'https://github.com/test/upstream.git',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
      };

      const config = createConfig(userConfig);

      expect(config.userName).toBe('github-actions');
      expect(config.email).toBe('action@github.com');
      expect(config.remote.head.branch).toBe('main');
      expect(config.pathStartsWith).toBeUndefined();
    });

    it('should handle different repository URL formats', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        upstreamRepo: 'https://github.com/org-name/repo-name',
        headRepo: 'git@github.com:other-org/other-repo.git',
        trackFrom: 'test-hash',
      };

      const config = createConfig(userConfig);

      expect(config.remote.upstream.owner).toBe('org-name');
      expect(config.remote.upstream.name).toBe('repo-name');
      expect(config.remote.head.owner).toBe('other-org');
      expect(config.remote.head.name).toBe('other-repo');
    });
  });
});
