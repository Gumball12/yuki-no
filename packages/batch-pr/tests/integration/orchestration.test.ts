import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('batch-pr plugin integration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.YUKI_NO_BATCH_PR_ROOT_DIR = 'docs';
    process.env.YUKI_NO_BATCH_PR_EXCLUDE = '**/*.spec.ts\n**/*.test.ts';

    // GitHub mock
    vi.mock('@yuki-no/plugin-sdk/infra/github', () => {
      const pullsUpdate = vi.fn(async () => ({}));
      class GitHub {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(readonly config: any) {}
        get ownerAndRepo() {
          return { owner: 'acme', repo: 'upstream' };
        }
        get configuredLabels() {
          return ['sync'];
        }
        api = { pulls: { update: pullsUpdate } };
      }
      // @ts-expect-error test helper
      globalThis.__mockBP_GH = { pullsUpdate };
      return { GitHub };
    });

    // Git mock
    vi.mock('@yuki-no/plugin-sdk/infra/git', () => {
      class Git {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(readonly _config: any) {}
        exec = vi.fn((_cmd: string) => 'ok');
      }
      // @ts-expect-error test helper
      globalThis.__mockBP_GitExecs = [];
      return { Git };
    });

    // plugin-sdk utils
    vi.mock('@yuki-no/plugin-sdk/utils-infra/getOpenedIssues', () => ({
      getOpenedIssues: vi.fn(async () => [
        {
          number: 111,
          body: 'A',
          labels: ['sync'],
          hash: 'aaaaaaaa',
          isoDate: '2024-01-01T00:00:00Z',
        },
        {
          number: 222,
          body: 'B',
          labels: ['sync'],
          hash: 'bbbbbbbb',
          isoDate: '2024-01-02T00:00:00Z',
        },
        {
          number: 333,
          body: 'C',
          labels: ['sync'],
          hash: 'cccccccc',
          isoDate: '2024-01-03T00:00:00Z',
        },
      ]),
    }));

    vi.mock('@yuki-no/plugin-sdk/utils/createFileNameFilter', () => ({
      createFileNameFilter: vi.fn(
        (_cfg: any, _root?: string) => (file: string) =>
          !file.endsWith('.spec.ts') &&
          !file.endsWith('.test.ts') &&
          file.startsWith('docs/'),
      ),
    }));

    vi.mock('@yuki-no/plugin-sdk/utils/input', async importOriginal => {
      const orig =
        await importOriginal<
          typeof import('@yuki-no/plugin-sdk/utils/input')
        >();
      return { ...orig };
    });

    // batch-pr utils mocks/spies
    vi.mock('../../utils/filterPendedTranslationIssues', () => ({
      filterPendedTranslationIssues: vi.fn(async (_gh: any, issues: any[]) =>
        issues.filter(i => i.number !== 333),
      ),
    }));

    vi.mock('../../utils/setupBatchPr', () => ({
      setupBatchPr: vi.fn(async () => ({ prNumber: 123 })),
    }));

    vi.mock('../../utils/getTrackedIssues', () => ({
      getTrackedIssues: vi.fn(async () => ({
        trackedIssues: [{ number: 111, hash: 'aaaaaaaa' }],
        shouldTrackIssues: [
          { number: 222, hash: 'bbbbbbbb' },
          { number: 222, hash: 'bbbbbbbb' },
        ],
      })),
    }));

    vi.mock('../../utils/extractFileChanges', () => ({
      extractFileChanges: vi.fn(
        (
          _git: any,
          hash: string,
          filter: (f: string) => boolean,
          opts: { onExcluded: (p: string) => void; rootDir?: string },
        ) => {
          const files = [
            `docs/${hash}/keep.md`,
            `docs/${hash}/skip.spec.ts`,
            `src/${hash}/ignored.ts`,
          ];
          const out = [] as import('../../types').FileChange[];
          for (const f of files) {
            if (!filter(f)) {
              opts.onExcluded(f);
              continue;
            }
            out.push({
              type: 'update',
              upstreamFileName: f,
              changes: [{ type: 'insert-line', lineNumber: 1, content: 'x' }],
            });
          }
          return out;
        },
      ),
    }));

    vi.mock('../../utils/applyFileChanges', () => ({
      applyFileChanges: vi.fn(async () => {}),
    }));

    vi.mock('../../utils/createCommit', () => ({
      createCommit: vi.fn((_git: any, _opts: any) => {}),
    }));

    vi.mock('../../utils/createPrBody', () => ({
      createPrBody: vi.fn(
        (items: any[], meta: any) =>
          `Body ${items.length} ${JSON.stringify(meta.excludedFiles)}`,
      ),
    }));
  });

  afterEach(() => {
    delete process.env.YUKI_NO_BATCH_PR_ROOT_DIR;
    delete process.env.YUKI_NO_BATCH_PR_EXCLUDE;
  });

  it('Happy path: sets up PR, aggregates changes, pushes and updates PR body', async () => {
    const plugin = (await import('../../index')).default;

    const config = {
      labels: ['sync'],
      exclude: [],
      headRepoSpec: { owner: 'acme', name: 'head', branch: 'main' },
      upstreamRepoSpec: { owner: 'acme', name: 'upstream', branch: 'main' },
    } as any;

    await plugin.onFinally?.({ config } as any);

    const { pullsUpdate } = (globalThis as any).__mockBP_GH as {
      pullsUpdate: ReturnType<typeof vi.fn>;
    };
    expect(pullsUpdate).toHaveBeenCalled();
    const arg = pullsUpdate.mock.calls[0][0];
    expect(arg).toMatchObject({
      owner: 'acme',
      repo: 'upstream',
      pull_number: 123,
    });
    expect(arg.body).toContain('Body 1');
  });

  it('Skip when no pending translation issues', async () => {
    const { filterPendedTranslationIssues } = await import(
      '../../utils/filterPendedTranslationIssues'
    );
    (filterPendedTranslationIssues as any).mockResolvedValueOnce([]);

    const plugin = (await import('../../index')).default;
    const config = {
      labels: ['sync'],
      exclude: [],
      headRepoSpec: { owner: 'acme', name: 'head', branch: 'main' },
      upstreamRepoSpec: { owner: 'acme', name: 'upstream', branch: 'main' },
    } as any;

    await plugin.onFinally?.({ config } as any);

    const { pullsUpdate } = (globalThis as any).__mockBP_GH as {
      pullsUpdate: ReturnType<typeof vi.fn>;
    };
    expect(pullsUpdate).not.toHaveBeenCalled();
  });

  it('Skip when no file changes extracted', async () => {
    const { extractFileChanges } = await import(
      '../../utils/extractFileChanges'
    );
    (extractFileChanges as any).mockImplementation(
      (_git: any, _hash: string) => [],
    );

    const plugin = (await import('../../index')).default;
    const config = {
      labels: ['sync'],
      exclude: [],
      headRepoSpec: { owner: 'acme', name: 'head', branch: 'main' },
      upstreamRepoSpec: { owner: 'acme', name: 'upstream', branch: 'main' },
    } as any;

    await plugin.onFinally?.({ config } as any);

    const { pullsUpdate } = (globalThis as any).__mockBP_GH as {
      pullsUpdate: ReturnType<typeof vi.fn>;
    };
    expect(pullsUpdate).not.toHaveBeenCalled();
  });
});
