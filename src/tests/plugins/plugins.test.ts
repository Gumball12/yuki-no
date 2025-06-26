import { loadPlugins } from '../../plugins/core';

import { describe, expect, it, vi } from 'vitest';

describe('plugin loading and hooks', () => {
  it('loads plugin and calls hooks', async () => {
    const plugins = await loadPlugins(['yuki-no-plugin-example']);
    const plugin = plugins[0];
    const ctx: any = { octokit: {}, context: {}, inputs: {} };
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
