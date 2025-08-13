import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Core Orchestration Integration', () => {
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
    process.env.PLUGINS = 'mock-plugin@1.0.0';
    process.env.VERBOSE = 'true';

    vi.mock('mock-plugin', () => {
      let resolve: (v?: unknown) => void;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const done = new Promise(r => (resolve = r));
      const events: unknown[] = [];
      const plugin = {
        name: 'mock-plugin',
        onInit(ctx: unknown) {
          events.push(['onInit', ctx]);
        },
        onBeforeCompare(ctx: unknown) {
          events.push(['onBeforeCompare', ctx]);
        },
        onAfterCompare(ctx: unknown) {
          events.push(['onAfterCompare', ctx]);
        },
        onBeforeCreateIssue(ctx: unknown) {
          events.push(['onBeforeCreateIssue', ctx]);
        },
        onAfterCreateIssue(ctx: unknown) {
          events.push(['onAfterCreateIssue', ctx]);
        },
        onError(ctx: unknown) {
          events.push(['onError', ctx]);
        },
        onFinally(ctx: unknown) {
          events.push(['onFinally', ctx]);
          resolve();
        },
      };
      // Expose captured data without importing the module in tests
      (globalThis as any).__mockPlugin = { events, done };
      return { default: plugin };
    });

    vi.mock('../../infra/git.ts', () => {
      class Git {
        repoUrl = 'https://github.com/acme/head';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(_: any) {}
        clone() {}
        exec(_cmd: string) {
          const sep = ':COMMIT_START_SEP:';
          const data = ':COMMIT_DATA_SEP:';
          const c1 = `${sep}1111111${data}feat: one${data}2024-01-01T00:00:00Z\nsrc/a.ts`;
          const c2 = `${sep}2222222${data}fix: two${data}2024-01-02T00:00:00Z\nsrc/keep.ts\nREADME.md`;
          return [c1, c2].join('');
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
              data: {
                workflow_runs: [
                  { name: 'yuki-no', created_at: '2024-01-01T00:00:00Z' },
                ],
              },
            }),
          },
          search: {
            issuesAndPullRequests: async () => ({
              data: {
                items: [
                  {
                    body: 'See commit https://github.com/acme/upstream/commit/2222222',
                  },
                ],
              },
            }),
          },
          issues: {
            create: vi.fn(
              async ({
                title,
                body,
                labels,
              }: {
                title: string;
                body: string;
                labels: string[];
              }) => {
                if (process.env.TEST_FORCE_ISSUE_CREATE_FAIL === 'true') {
                  throw new Error('create failed');
                }
                return {
                  data: {
                    number: 123,
                    created_at: '2024-01-03T00:00:00Z',
                    title,
                    body,
                    labels,
                  },
                };
              },
            ),
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

  it('Happy path: creates 1 issue and triggers plugin hooks', async () => {
    // @ts-expect-error for testing
    await import('mock-plugin');
    await import('../../index.ts');
    const { done, events } = (globalThis as any).__mockPlugin as {
      done: Promise<void>;
      events: unknown[];
    };
    await done;

    const calls = (events as any[]).map(e => (e as any[])[0] as string);

    expect(calls).toContain('onInit');
    expect(calls).toContain('onBeforeCompare');
    expect(calls).toContain('onAfterCompare');
    expect(
      calls.filter((c: string) => c === 'onBeforeCreateIssue'),
    ).toHaveLength(1);
    expect(
      calls.filter((c: string) => c === 'onAfterCreateIssue'),
    ).toHaveLength(1);
    expect(calls).toContain('onFinally');

    const beforeCreate = (
      (events as any[]).find(
        e => (e as any[])[0] === 'onBeforeCreateIssue',
      ) as any[]
    )[1] as any;
    expect(beforeCreate.issueMeta.title).toBe('feat: one');
    expect(beforeCreate.issueMeta.labels).toEqual(['sync']);
    expect(beforeCreate.issueMeta.body).toContain(
      'https://github.com/acme/head/commit/1111111',
    );
  });
});
