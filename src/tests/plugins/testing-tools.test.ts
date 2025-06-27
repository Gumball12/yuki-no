import type { YukiNoPlugin } from '../../plugins/core';
import {
  createTestContext,
  loadPluginForTesting,
  runHook,
} from '../../plugins/testing-tools';

import { describe, expect, it, vi } from 'vitest';

const mockExamplePlugin: YukiNoPlugin = {
  name: 'yuki-no-test-plugin',
  async onInit() {},
  async onBeforeCompare() {},
  async onAfterCompare() {},
  async onBeforeCreateIssue() {},
  async onAfterCreateIssue() {},
  async onExit() {},
  async onError() {},
};

vi.doMock('yuki-no-test-plugin', () => ({
  default: mockExamplePlugin,
}));

describe('plugin testing tools', () => {
  it('loads plugin for testing', async () => {
    const plugin = await loadPluginForTesting('yuki-no-test-plugin');
    expect(plugin.name).toBe('yuki-no-test-plugin');
  });

  it('creates test context', () => {
    const ctx = createTestContext({ token: 'value' });
    expect(ctx.inputs.token).toBe('value');
  });

  it('runHook executes specified hook', async () => {
    const plugin = await loadPluginForTesting('yuki-no-test-plugin');
    const ctx = createTestContext();

    const spy = vi.spyOn(plugin, 'onInit' as any);
    await runHook(plugin, 'onInit', ctx);

    expect(spy).toHaveBeenCalledWith(ctx);
    spy.mockRestore();
  });
});
