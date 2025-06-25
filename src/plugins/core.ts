import type { Commit } from '../git/getCommits';
import type { Issue } from '../github/getOpenedIssues';

import type { Context } from '@actions/github/lib/context';
import type { Octokit } from '@octokit/rest';

export type YukiNoContext = {
  octokit: Octokit;
  context: Context;
  inputs: Record<string, string>;
};

export type IssueMeta = {
  title: string;
  body: string;
  labels: string[];
};

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
      const mod = await import(name);
      const plugin = mod.default as YukiNoPlugin | undefined;
      if (!plugin) {
        throw new Error('Invalid plugin');
      }
      plugins.push(plugin);
    } catch {
      throw new Error(`Failed to load plugin: ${name}`);
    }
  }

  return plugins;
};
