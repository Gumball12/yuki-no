import type { YukiNoContext, YukiNoPlugin } from './core';
import { loadPlugins } from './core';

import type { Context } from '@actions/github/lib/context';
import type { Octokit } from '@octokit/rest';

export const createTestContext = (
  envVars: Record<string, string> = {},
  octokit: Octokit = {} as Octokit,
  context: Context = {} as Context,
): YukiNoContext => {
  // Set environment variables for testing
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  return {
    octokit,
    context,
  };
};

export const loadPluginForTesting = async (
  path: string,
): Promise<YukiNoPlugin> => {
  const [plugin] = await loadPlugins([path]);
  return plugin;
};

export const runHook = async (
  plugin: YukiNoPlugin,
  hook: keyof YukiNoPlugin,
  ctx: any,
): Promise<void> => {
  const fn = (plugin as any)[hook];
  if (typeof fn === 'function') {
    await fn(ctx);
  }
};
