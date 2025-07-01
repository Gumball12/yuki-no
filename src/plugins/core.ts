import type { Config } from '../createConfig';
import type { Commit } from '../git/getCommits';
import type { Issue } from '../github/getOpenedIssues';

import type { Context } from '@actions/github/lib/context';
import type { Octokit } from '@octokit/rest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type YukiNoContext = Readonly<{
  octokit: Octokit;
  context: Context;
  config: Config;
}>;

export type IssueMeta = Readonly<{
  title: string;
  body: string;
  labels: string[];
}>;

export type IssueResult = Issue;

export interface YukiNoPluginHooks {
  onInit?(ctx: YukiNoContext): Promise<void> | void;
  onBeforeCompare?(ctx: YukiNoContext): Promise<void> | void;
  onAfterCompare?(
    ctx: YukiNoContext & { commits: Commit[] },
  ): Promise<void> | void;
  onBeforeCreateIssue?(
    ctx: YukiNoContext & { commit: Commit; meta: IssueMeta },
  ): Promise<void> | void;
  onAfterCreateIssue?(
    ctx: YukiNoContext & { commit: Commit; result: IssueResult },
  ): Promise<void> | void;
  onExit?(ctx: YukiNoContext & { success: boolean }): Promise<void> | void;
  onError?(ctx: YukiNoContext & { error: Error }): Promise<void> | void;
}

export interface YukiNoPlugin extends YukiNoPluginHooks {
  name: string;
}

export const loadPlugins = async (names: string[]): Promise<YukiNoPlugin[]> => {
  const plugins: YukiNoPlugin[] = [];

  for (const name of names) {
    try {
      const id = getResolveId(name);
      const mod = await import(id);
      const plugin = mod.default as YukiNoPlugin | undefined;

      if (!plugin) {
        throw new Error(
          `Plugin "${name}" does not export a default plugin object`,
        );
      }

      if (!plugin.name) {
        throw new Error(`Plugin "${name}" must have a "name" property`);
      }

      plugins.push(plugin);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to load plugin "${name}": ${err.message}`);
    }
  }

  return plugins;
};

const CORE_PLUGIN_ROOT = path.dirname(fileURLToPath(import.meta.url));

export const getResolveId = (name: string): string => {
  const isCorePlugin = name.startsWith('core:');

  if (isCorePlugin) {
    const pluginName = name.slice(5); // Remove 'core:' prefix
    return path.resolve(CORE_PLUGIN_ROOT, pluginName);
  }

  const isScopedPackage = name.startsWith('@');

  if (isScopedPackage) {
    return name.split('@').slice(0, 2).join('@');
  }

  if (name.includes('@')) {
    return name.split('@')[0];
  }

  return name;
};
