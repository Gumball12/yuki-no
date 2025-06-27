import {
  createTestContext,
  loadPluginForTesting,
  runHook,
} from '../../plugins/testing-tools';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExamplePlugin = {
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
  beforeEach(() => {
    // Clean up environment variables before each test
    delete process.env.TEST_TOKEN;
    delete process.env.PLUGIN_MESSAGE;
  });

  it('loads plugin for testing', async () => {
    const plugin = await loadPluginForTesting('yuki-no-test-plugin');
    expect(plugin.name).toBe('yuki-no-test-plugin');
  });

  it('creates test context with environment variables', () => {
    const ctx = createTestContext({ TEST_TOKEN: 'value' });
    expect(process.env.TEST_TOKEN).toBe('value');
    expect(ctx.octokit).toBeDefined();
    expect(ctx.context).toBeDefined();
  });

  it('runHook executes specified hook', async () => {
    const plugin = await loadPluginForTesting('yuki-no-test-plugin');
    const ctx = createTestContext({ PLUGIN_MESSAGE: 'test message' });

    const spy = vi.spyOn(plugin, 'onInit' as any);
    await runHook(plugin, 'onInit', ctx);

    expect(spy).toHaveBeenCalledWith(ctx);
    spy.mockRestore();
  });
});
