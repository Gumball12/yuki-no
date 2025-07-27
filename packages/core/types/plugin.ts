import type { Config } from './config';
import type { Commit } from './git';
import type { Issue, IssueMeta } from './github';

export type YukiNoContext = Readonly<{
  config: Config;
  env: Record<string, string>;
}>;

export interface YukiNoPlugin extends YukiNoPluginHooks {
  name: string;
}

interface YukiNoPluginHooks {
  onInit?(ctx: YukiNoContext): Promise<void> | void;
  onBeforeCompare?(ctx: YukiNoContext): Promise<void> | void;
  onAfterCompare?(
    ctx: YukiNoContext & { commits: Commit[] },
  ): Promise<void> | void;
  onBeforeCreateIssue?(
    ctx: YukiNoContext & { commit: Commit; issueMeta: IssueMeta },
  ): Promise<void> | void;
  onAfterCreateIssue?(
    ctx: YukiNoContext & { commit: Commit; issue: Issue },
  ): Promise<void> | void;
  onFinally?(ctx: YukiNoContext & { success: boolean }): Promise<void> | void;
  onError?(ctx: YukiNoContext & { error: Error }): Promise<void> | void;
}
