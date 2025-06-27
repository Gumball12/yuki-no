import {
  createTestContext,
  loadPluginForTesting,
  runHook,
} from '../../plugins/testing-tools';

import { describe, expect, it, vi } from 'vitest';

describe('plugin testing tools', () => {
  it('loads plugin for testing', async () => {
    const plugin = await loadPluginForTesting('yuki-no-plugin-example');
    expect(plugin.name).toBe('yuki-no-example');
  });

  it('creates test context', () => {
    const ctx = createTestContext({ token: 'value' });
    expect(ctx.inputs.token).toBe('value');
  });

  it('runHook executes specified hook', async () => {
    const plugin = await loadPluginForTesting('yuki-no-plugin-example');
    const ctx = createTestContext();
    const spy = vi.spyOn(plugin, 'onInit');
    await runHook(plugin, 'onInit', ctx);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
