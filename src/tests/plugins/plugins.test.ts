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
    vi.doMock('test-invalid-plugin', () => ({
      default: undefined,
      someOtherExport: 'test',
    }));

    await expect(loadPlugins(['test-invalid-plugin'])).rejects.toThrow(
      'Invalid plugin',
    );

    vi.doUnmock('test-invalid-plugin');
  });
});
