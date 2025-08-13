import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Core Orchestration Integration - Error path', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.ACCESS_TOKEN = 'test-token';
    process.env.USER_NAME = 'bot';
    process.env.EMAIL = 'bot@ex.com';
    process.env.UPSTREAM_REPO = 'https://github.com/acme/upstream.git';
    process.env.HEAD_REPO = 'https://github.com/acme/head.git';
    process.env.HEAD_REPO_BRANCH = 'main';
    process.env.TRACK_FROM = 'aaaaaaaa';
    process.env.LABELS = 'sync';
    process.env.PLUGINS = 'mock-plugin-err@1.0.0';
    process.env.VERBOSE = 'true';

    vi.mock('mock-plugin-err', () => {
      let resolve: (v?: unknown) => void;
      const done = new Promise<unknown>(r => (resolve = r));
      const events: unknown[] = [];
      const plugin = {
        name: 'mock-plugin-err',
        onInit(ctx: unknown) {
          events.push(['onInit', ctx]);
        },
        onBeforeCompare() {
          events.push(['onBeforeCompare']);
          throw new Error('boom');
        },
        onError(ctx: unknown) {
          events.push(['onError', ctx]);
        },
        onFinally(ctx: unknown) {
          events.push(['onFinally', ctx]);
          resolve();
        },
      };
      (globalThis as any).__mockErrPlugin = { events, done };
      return { default: plugin };
    });

    vi.mock('../../infra/git.ts', () => {
      class Git {
        repoUrl = 'https://github.com/acme/head';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(_: any) {}
        clone() {}
        exec() {
          return '';
        }
      }
      return { Git };
    });

    vi.mock('../../infra/github.ts', () => {
      class GitHub {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(readonly config: any) {}
        get ownerAndRepo() {
          return {
            owner: this.config.repoSpec.owner,
            repo: this.config.repoSpec.name,
          };
        }
        get repoSpec() {
          return this.config.repoSpec;
        }
        get configuredLabels() {
          return this.config.labels;
        }
        api = {
          actions: {
            listWorkflowRunsForRepo: async () => ({
              data: { workflow_runs: [] },
            }),
          },
          search: {
            issuesAndPullRequests: async () => ({ data: { items: [] } }),
          },
          issues: {
            create: vi.fn(async () => ({
              data: { number: 1, created_at: '2024-01-01T00:00:00Z' },
            })),
          },
        };
      }
      return { GitHub };
    });
  });

  afterEach(() => {
    delete process.env.ACCESS_TOKEN;
    delete process.env.USER_NAME;
    delete process.env.EMAIL;
    delete process.env.UPSTREAM_REPO;
    delete process.env.HEAD_REPO;
    delete process.env.HEAD_REPO_BRANCH;
    delete process.env.TRACK_FROM;
    delete process.env.LABELS;
    delete process.env.PLUGINS;
    delete process.env.VERBOSE;
  });

  it('Error path: triggers onError in catch and onFinally with success=false', async () => {
    process.once('unhandledRejection', (reason: unknown) => {
      if (reason instanceof Error && reason.message === 'boom') {
        return;
      }
      throw reason;
    });

    // @ts-expect-error for testing
    await import('mock-plugin-err');
    await import('../../index.ts');
    const { done, events } = (globalThis as any).__mockErrPlugin as {
      done: Promise<void>;
      events: unknown[];
    };
    await done;

    const calls = (events as any[]).map(e => (e as any[])[0] as string);
    expect(calls).toContain('onInit');
    expect(calls).toContain('onBeforeCompare');
    expect(calls).toContain('onError');
    expect(calls).toContain('onFinally');

    const finallyPayload = (
      (events as any[]).find(e => (e as any[])[0] === 'onFinally') as any[]
    )[1] as any;
    expect(finallyPayload.success).toBe(false);
  });
});
