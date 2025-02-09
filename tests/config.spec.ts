import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createConfig } from '../src/config';
import type { UserConfig } from '../src/config';
import { defaults } from 'src/defaults';

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.GITHUB_SERVER_URL = 'https://github.com';
  process.env.GITHUB_REPOSITORY = 'test/current-repo';
});

afterEach(() => {
  process.env = originalEnv;
});

describe('createConfig', () => {
  it('should create config with only required fields', () => {
    const userConfig: UserConfig = {
      accessToken: 'test-token',
      headRepo: 'https://github.com/test/head.git',
      trackFrom: 'test-hash',
    };

    const config = createConfig(userConfig);

    expect(config).toEqual({
      userName: 'github-actions',
      email: 'action@github.com',
      accessToken: 'test-token',
      trackFrom: 'test-hash',
      include: [],
      exclude: [],
      labels: [defaults.label],
      releaseTracking: false,
      releaseTrackingLabels: [defaults.releaseTrackingLabel],
      verbose: false,
      remote: {
        upstream: {
          url: 'https://github.com/test/current-repo.git',
          owner: 'test',
          name: 'current-repo',
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

  it('should use provided upstream repo over inferred one', () => {
    const userConfig: UserConfig = {
      accessToken: 'test-token',
      upstreamRepo: 'https://github.com/test/upstream.git',
      headRepo: 'https://github.com/test/head.git',
      trackFrom: 'test-hash',
    };

    const config = createConfig(userConfig);

    expect(config.remote.upstream).toEqual({
      url: 'https://github.com/test/upstream.git',
      owner: 'test',
      name: 'upstream',
      branch: 'main',
    });
  });

  it('should throw error when GitHub repository cannot be inferred', () => {
    delete process.env.GITHUB_REPOSITORY;

    const userConfig: UserConfig = {
      accessToken: 'test-token',
      headRepo: 'https://github.com/test/head.git',
      trackFrom: 'test-hash',
    };

    expect(() => createConfig(userConfig)).toThrow(
      'Failed to infer upstream repository: GITHUB_REPOSITORY environment variable is not set',
    );
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
      include: '**/*.md\n**/*.ts',
      exclude: '**/*.test.ts\n**/__tests__/**',
      labels: 'test\nmy\nlabel',
      releaseTracking: 'true',
      releaseTrackingLabels: 'unreleased\nwip',
      verbose: 'true',
    };

    const config = createConfig(userConfig);

    expect(config).toEqual({
      userName: 'test-user',
      email: 'test@example.com',
      accessToken: 'test-token',
      trackFrom: 'test-hash',
      include: ['**/*.md', '**/*.ts'],
      exclude: ['**/*.test.ts', '**/__tests__/**'],
      labels: ['test', 'my', 'label'],
      releaseTracking: true,
      releaseTrackingLabels: ['unreleased', 'wip'],
      verbose: true,
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
      headRepo: 'https://github.com/test/head.git',
      trackFrom: 'test-hash',
    };

    const config = createConfig(userConfig);

    expect(config.userName).toBe('github-actions');
    expect(config.email).toBe('action@github.com');
    expect(config.remote.head.branch).toBe('main');
    expect(config.include).toEqual([]);
    expect(config.exclude).toEqual([]);
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

  describe('Label Handling', () => {
    it('should use default sync label when labels not provided', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
      };

      const config = createConfig(userConfig);
      expect(config.labels).toEqual([defaults.label]);
    });

    it('should use empty array when empty string provided for labels', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
        labels: '',
      };

      const config = createConfig(userConfig);
      expect(config.labels).toEqual([]);
    });

    it('should parse newline separated labels', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
        labels: 'label1\nlabel2\nlabel3',
      };

      const config = createConfig(userConfig);
      expect(config.labels).toEqual(['label1', 'label2', 'label3']);
    });

    it('should use default pending label when release tracking labels not provided', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
        releaseTracking: 'true',
      };

      const config = createConfig(userConfig);
      expect(config.releaseTrackingLabels).toEqual([
        defaults.releaseTrackingLabel,
      ]);
    });

    it('should use empty array when empty string provided for release tracking labels', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
        releaseTracking: 'true',
        releaseTrackingLabels: '',
      };

      const config = createConfig(userConfig);
      expect(config.releaseTrackingLabels).toEqual([]);
    });

    it('should parse newline separated release tracking labels', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
        releaseTracking: 'true',
        releaseTrackingLabels: 'pending\nunreleased\nwip',
      };

      const config = createConfig(userConfig);
      expect(config.releaseTrackingLabels).toEqual([
        'pending',
        'unreleased',
        'wip',
      ]);
    });

    it('should filter out duplicate labels between issue labels and release tracking labels', () => {
      const userConfig: UserConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
        labels: 'sync\npending',
        releaseTracking: 'true',
        releaseTrackingLabels: 'pending\nunreleased\nwip',
      };

      const config = createConfig(userConfig);
      expect(config.labels).toEqual(['sync', 'pending']);
      expect(config.releaseTrackingLabels).toEqual(['unreleased', 'wip']);
    });
  });

  describe('File Pattern Handling', () => {
    it('should parse include patterns correctly', () => {
      const userConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
        include: '**/*.md\n**/*.ts',
      };

      const config = createConfig(userConfig);
      expect(config.include).toEqual(['**/*.md', '**/*.ts']);
    });

    it('should parse exclude patterns correctly', () => {
      const userConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
        exclude: '**/*.test.ts\n**/__tests__/**',
      };

      const config = createConfig(userConfig);
      expect(config.exclude).toEqual(['**/*.test.ts', '**/__tests__/**']);
    });

    it('should handle empty include/exclude patterns', () => {
      const userConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
        include: '',
        exclude: '',
      };

      const config = createConfig(userConfig);
      expect(config.include).toEqual([]);
      expect(config.exclude).toEqual([]);
    });

    it('should handle undefined include/exclude patterns', () => {
      const userConfig = {
        accessToken: 'test-token',
        headRepo: 'https://github.com/test/head.git',
        trackFrom: 'test-hash',
      };

      const config = createConfig(userConfig);
      expect(config.include).toEqual([]);
      expect(config.exclude).toEqual([]);
    });
  });
});
