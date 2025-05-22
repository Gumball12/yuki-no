import {
  createConfig,
  inferUpstreamRepo,
  defaults as yukiNoDefaults,
} from '../createConfig';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const TEST_ENV = {
  ACCESS_TOKEN: 'test-token',
  HEAD_REPO: 'https://github.com/test/head-repo.git',
  TRACK_FROM: 'test-commit-hash',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'test/current-repo',
};

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv, ...TEST_ENV };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Basic configuration creation', () => {
  it('Creates basic configuration with only required envs', () => {
    const config = createConfig();

    expect(config).toEqual({
      accessToken: TEST_ENV.ACCESS_TOKEN,
      userName: yukiNoDefaults.userName,
      email: yukiNoDefaults.email,
      upstreamRepoSpec: {
        owner: 'test',
        name: 'current-repo',
        branch: yukiNoDefaults.branch,
      },
      headRepoSpec: {
        owner: 'test',
        name: 'head-repo',
        branch: yukiNoDefaults.branch,
      },
      trackFrom: TEST_ENV.TRACK_FROM,
      include: [],
      exclude: [],
      labels: [yukiNoDefaults.label],
      releaseTracking: false,
      releaseTrackingLabels: [yukiNoDefaults.releaseTrackingLabel],
      verbose: false,
      plugins: [], // Default plugins is an empty array
    });
  });

  it('Checks if the specified default value is used when the GITHUB_SERVER_URL env is not present', () => {
    delete process.env.GITHUB_SERVER_URL;

    const upstreamRepoUrl = inferUpstreamRepo();

    expect(upstreamRepoUrl).toEqual(
      expect.stringContaining('https://github.com'),
    );
  });
});

describe('Custom envs processing', () => {
  it('Creates correct configuration when all envs are provided', () => {
    const LOCAL_TEST_ENV = {
      USER_NAME: 'custom-user',
      EMAIL: 'custom@example.com',
      UPSTREAM_REPO: 'https://github.com/test/upstream-repo.git',
      HEAD_REPO_BRANCH: 'develop',
      INCLUDE: '**/*.md\n**/*.ts',
      EXCLUDE: 'node_modules\ndist',
      LABELS: 'label1\nlabel2',
      RELEASE_TRACKING: 'true',
      RELEASE_TRACKING_LABELS: 'pending-release\nreleased',
      VERBOSE: 'true',
    };

    process.env = { ...process.env, ...LOCAL_TEST_ENV };

    const config = createConfig();

    expect(config).toEqual({
      accessToken: TEST_ENV.ACCESS_TOKEN,
      userName: LOCAL_TEST_ENV.USER_NAME,
      email: LOCAL_TEST_ENV.EMAIL,
      upstreamRepoSpec: {
        owner: 'test',
        name: 'upstream-repo',
        branch: yukiNoDefaults.branch,
      },
      headRepoSpec: {
        owner: 'test',
        name: 'head-repo',
        branch: LOCAL_TEST_ENV.HEAD_REPO_BRANCH,
      },
      trackFrom: TEST_ENV.TRACK_FROM,
      include: ['**/*.md', '**/*.ts'],
      exclude: ['node_modules', 'dist'],
      labels: ['label1', 'label2'].sort(),
      releaseTracking: true,
      releaseTrackingLabels: ['pending-release', 'released'],
      verbose: true,
      plugins: [], // Default plugins is an empty array
    });
  });
});

describe('Error handling', () => {
  it('Throws an error when required envs are missing', () => {
    delete process.env.ACCESS_TOKEN;

    expect(() => createConfig()).toThrow('`accessToken` is required.');

    process.env.ACCESS_TOKEN = TEST_ENV.ACCESS_TOKEN;
    delete process.env.HEAD_REPO;

    expect(() => createConfig()).toThrow('`headRepo` is required.');

    process.env.HEAD_REPO = TEST_ENV.HEAD_REPO;
    delete process.env.TRACK_FROM;

    expect(() => createConfig()).toThrow('`trackFrom` is required.');
  });

  it('Throws an error when GITHUB_REPOSITORY is missing and UPSTREAM_REPO is also missing', () => {
    delete process.env.GITHUB_REPOSITORY;

    expect(() => createConfig()).toThrow(
      'Failed to infer upstream repository: GITHUB_REPOSITORY environment variable is not set.',
    );
  });
});

describe('Plugins configuration', () => {
  it('Parses valid plugins YAML string', () => {
    process.env.PLUGINS = `
      - name: core:issue-creator
        options:
          customLabel: 'bug'
      - name: my-custom-plugin
        options:
          apiKey: '123'
    `;
    const config = createConfig();
    expect(config.plugins).toEqual([
      { name: 'core:issue-creator', options: { customLabel: 'bug' } },
      { name: 'my-custom-plugin', options: { apiKey: '123' } },
    ]);
  });

  it('Parses valid plugins YAML string with a single plugin and no options', () => {
    process.env.PLUGINS = `
      - name: core:release-tracker
    `;
    const config = createConfig();
    expect(config.plugins).toEqual([{ name: 'core:release-tracker' }]);
  });

  it('Handles empty PLUGINS env as empty array', () => {
    process.env.PLUGINS = '';
    const config = createConfig();
    expect(config.plugins).toEqual([]);
  });

  it('Handles undefined PLUGINS env as empty array', () => {
    delete process.env.PLUGINS;
    const config = createConfig();
    expect(config.plugins).toEqual([]);
  });

  it('Handles invalid YAML string, defaults to empty array and logs error', () => {
    process.env.PLUGINS = 'invalid-yaml: [1,2,3';
    // Mock console.error or log.E to check for error logging
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const config = createConfig();
    expect(config.plugins).toEqual([]);
    // Check if error was logged (implementation specific, assuming log.E calls console.error)
    // This test depends on js-yaml logging behavior or our own log wrapper.
    // For now, we assume js-yaml might log, or our wrapper would.
    // As createConfig uses `log('E', ...)` which defaults to console.error via the `log` util.
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('Handles YAML with incorrect structure (not an array), defaults to empty array and logs error', () => {
    process.env.PLUGINS = `
      name: core:issue-creator
      options: { test: true }
    `;
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const config = createConfig();
    expect(config.plugins).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid plugin configuration. Expected an array of PluginConfig.'));
    consoleErrorSpy.mockRestore();
  });

  it('Handles YAML with array items not having a name, defaults to empty array and logs error', () => {
    process.env.PLUGINS = `
      - options: { test: true }
    `;
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const config = createConfig();
    expect(config.plugins).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid plugin configuration. Expected an array of PluginConfig.'));
    consoleErrorSpy.mockRestore();
  });
});
