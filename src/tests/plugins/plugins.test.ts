import { getInput } from '../../inputUtils';
import { loadPlugins } from '../../plugins/core';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExamplePlugin = {
  name: 'yuki-no-plugin-example',
  async onInit() {
    const myPluginInput = getInput('MY_PLUGIN_INPUT');
    if (myPluginInput) {
      console.log(`my-plugin-input: ${myPluginInput}`);
    }
  },
  async onBeforeCompare() {},
  async onAfterCompare() {},
  async onBeforeCreateIssue() {},
  async onAfterCreateIssue() {},
  async onExit() {},
  async onError() {},
};

vi.doMock('yuki-no-plugin-example', () => ({
  default: mockExamplePlugin,
}));

describe('plugin loading and hooks', () => {
  beforeEach(() => {
    delete process.env.MY_PLUGIN_INPUT;
  });

  it('loads plugin and calls hooks', async () => {
    const plugins = await loadPlugins(['yuki-no-plugin-example']);
    const plugin = plugins[0];
    const ctx: any = { octokit: {}, context: {} };
    const spies = {
      onInit: vi.spyOn(plugin, 'onInit'),
      onBeforeCompare: vi.spyOn(plugin, 'onBeforeCompare'),
      onAfterCompare: vi.spyOn(plugin, 'onAfterCompare'),
      onBeforeCreateIssue: vi.spyOn(plugin, 'onBeforeCreateIssue'),
      onAfterCreateIssue: vi.spyOn(plugin, 'onAfterCreateIssue'),
      onExit: vi.spyOn(plugin, 'onExit'),
    };

    await plugin.onInit?.(ctx);
    await plugin.onBeforeCompare?.(ctx);
    await plugin.onAfterCompare?.({ ...ctx, commits: [] });
    await plugin.onBeforeCreateIssue?.({
      ...ctx,
      commit: {} as any,
      meta: {} as any,
    });
    await plugin.onAfterCreateIssue?.({
      ...ctx,
      commit: {} as any,
      result: {} as any,
    });
    await plugin.onExit?.({ ...ctx, success: true });

    expect(spies.onInit).toHaveBeenCalled();
    expect(spies.onBeforeCompare).toHaveBeenCalled();
    expect(spies.onAfterCompare).toHaveBeenCalled();
    expect(spies.onBeforeCreateIssue).toHaveBeenCalled();
    expect(spies.onAfterCreateIssue).toHaveBeenCalled();
    expect(spies.onExit).toHaveBeenCalled();
  });

  it('example plugin logs token when provided via environment variable', async () => {
    process.env.MY_PLUGIN_INPUT = 'test-token';

    const plugins = await loadPlugins(['yuki-no-plugin-example']);
    const plugin = plugins[0];
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const ctx: any = {
      octokit: {},
      context: {},
    };

    await plugin.onInit?.(ctx);

    expect(consoleSpy).toHaveBeenCalledWith('my-plugin-input: test-token');

    consoleSpy.mockRestore();
  });

  it('example plugin does not log when environment variable is not provided', async () => {
    const plugins = await loadPlugins(['yuki-no-plugin-example']);
    const plugin = plugins[0];
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const ctx: any = {
      octokit: {},
      context: {},
    };

    await plugin.onInit?.(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('throws error for plugin without default export', async () => {
    const INVALID_PLUGIN_NAME = 'test-invalid-plugin';

    vi.doMock(INVALID_PLUGIN_NAME, () => ({
      default: undefined,
      someOtherExport: 'test',
    }));

    await expect(loadPlugins([INVALID_PLUGIN_NAME])).rejects.toThrow(
      `Plugin "${INVALID_PLUGIN_NAME}" does not export a default plugin object`,
    );

    vi.doUnmock(INVALID_PLUGIN_NAME);
  });

  it('throws error for plugin without plugin name', async () => {
    const INVALID_PLUGIN_NAME = 'test-invalid-plugin';

    vi.doMock(INVALID_PLUGIN_NAME, () => ({
      default: {},
      someOtherExport: 'test',
    }));

    await expect(loadPlugins([INVALID_PLUGIN_NAME])).rejects.toThrow(
      `Plugin "${INVALID_PLUGIN_NAME}" must have a "name" property`,
    );

    vi.doUnmock(INVALID_PLUGIN_NAME);
  });
});
