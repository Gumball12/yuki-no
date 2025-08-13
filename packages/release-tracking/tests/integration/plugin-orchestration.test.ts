import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('release-tracking plugin integration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.YUKI_NO_RELEASE_TRACKING_LABELS = 'pending';

    // Mock Git from plugin-sdk
    vi.mock('@yuki-no/plugin-sdk/infra/git', () => {
      class Git {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(_: any) {}
        repoUrl = 'https://github.com/acme/head';
        exec(cmd: string): string {
          if (cmd.startsWith('tag --contains')) {
            if (cmd.includes('1111111')) {
              return '1.0.0-beta.1\n1.0.0';
            }
            if (cmd.includes('AAAAAAA')) {
              return '';
            }
            if (cmd.includes('BBBBBBB')) {
              return '2.0.0';
            }
            return '';
          }
          if (cmd === 'tag') {
            return '1.0.0\n2.0.0';
          }
          return '';
        }
      }
      return { Git };
    });

    // Mock GitHub from plugin-sdk
    vi.mock('@yuki-no/plugin-sdk/infra/github', () => {
      const setLabels = vi.fn(async () => ({}));
      const createComment = vi.fn(async () => ({ data: { id: 1 } }));
      const listComments = vi.fn(async () => ({ data: [] }));

      class GitHub {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(readonly config: any) {}
        get ownerAndRepo() {
          return { owner: 'acme', repo: 'upstream' };
        }
        get configuredLabels() {
          return ['sync'];
        }
        api = {
          issues: { setLabels, createComment, listComments },
        };
      }

      // expose spies for assertions
      // @ts-expect-error test helper
      globalThis.__mockRT_GH = { setLabels, createComment, listComments };
      return { GitHub };
    });

    // Mock getOpenedIssues from plugin-sdk
    vi.mock('@yuki-no/plugin-sdk/utils-infra/getOpenedIssues', () => ({
      getOpenedIssues: vi.fn(async () => [
        {
          number: 10,
          body: 'A',
          labels: ['sync'],
          hash: 'AAAAAAA',
          isoDate: '2024-01-01T00:00:00Z',
        },
        {
          number: 20,
          body: 'B',
          labels: ['sync', 'pending'],
          hash: 'BBBBBBB',
          isoDate: '2024-01-02T00:00:00Z',
        },
      ]),
    }));
  });

  afterEach(() => {
    delete process.env.YUKI_NO_RELEASE_TRACKING_LABELS;
  });

  it('onAfterCreateIssue: updates labels and comment for the created issue', async () => {
    const plugin = (await import('../../index')).default;

    const config = {
      labels: ['sync'],
      headRepoSpec: { owner: 'acme', name: 'head', branch: 'main' },
      upstreamRepoSpec: { owner: 'acme', name: 'upstream', branch: 'main' },
    } as any;

    const issue = {
      number: 1,
      body: 'New updates',
      labels: ['sync', 'pending'],
      hash: '1111111',
      isoDate: '2024-01-01T00:00:00Z',
    };

    await plugin.onAfterCreateIssue?.({ config, issue } as any);

    // @ts-expect-error test helper
    const { setLabels, createComment } = globalThis.__mockRT_GH as {
      setLabels: ReturnType<typeof vi.fn>;
      createComment: ReturnType<typeof vi.fn>;
    };

    expect(setLabels).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'upstream',
      issue_number: 1,
      labels: ['sync'],
    });

    const commentArg = createComment.mock.calls[0][0];
    expect(commentArg).toMatchObject({
      owner: 'acme',
      repo: 'upstream',
      issue_number: 1,
    });
    expect(commentArg.body).toContain('- pre-release: [1.0.0-beta.1]');
    expect(commentArg.body).toContain('- release: [1.0.0]');
  });

  it('onFinally: processes opened issues and applies idempotent behavior', async () => {
    const plugin = (await import('../../index')).default;

    const config = {
      labels: ['sync'],
      headRepoSpec: { owner: 'acme', name: 'head', branch: 'main' },
      upstreamRepoSpec: { owner: 'acme', name: 'upstream', branch: 'main' },
    } as any;

    // First run - should update both issues (A: add pending, B: remove pending)
    await plugin.onFinally?.({ config } as any);

    // @ts-expect-error test helper
    const gh = globalThis.__mockRT_GH as {
      setLabels: ReturnType<typeof vi.fn>;
      createComment: ReturnType<typeof vi.fn>;
      listComments: ReturnType<typeof vi.fn>;
    };

    // A (unreleased) should add pending (order-insensitive)
    const callForA = gh.setLabels.mock.calls
      .map((c: any[]) => c[0])
      .find((arg: any) => arg.issue_number === 10);
    expect(callForA).toBeDefined();
    expect(callForA).toMatchObject({ owner: 'acme', repo: 'upstream' });
    expect(callForA.labels).toEqual(
      expect.arrayContaining(['sync', 'pending']),
    );
    expect(callForA.labels).toHaveLength(2);

    // B (released) should remove pending
    const callForB = gh.setLabels.mock.calls
      .map((c: any[]) => c[0])
      .find((arg: any) => arg.issue_number === 20);
    expect(callForB).toBeDefined();
    expect(callForB).toMatchObject({ owner: 'acme', repo: 'upstream' });
    expect(callForB.labels).toEqual(['sync']);

    // Ensure comments created for both
    const issueNums = gh.createComment.mock.calls
      .map((c: any[]) => c[0].issue_number)
      .sort();
    expect(issueNums).toEqual([10, 20]);

    // Second run - make listComments return identical comment to verify idempotency
    gh.listComments
      // Issue 10: previously created comment without release
      .mockResolvedValueOnce({
        data: [{ body: '- pre-release: none\n- release: none' }],
      })
      // Issue 20: previously created comment with release link
      .mockResolvedValueOnce({
        data: [
          {
            body: '- pre-release: none\n- release: [2.0.0](https://github.com/acme/head/releases/tag/2.0.0)',
          },
        ],
      });

    const beforeCalls = gh.createComment.mock.calls.length;
    await plugin.onFinally?.({ config } as any);
    const afterCalls = gh.createComment.mock.calls.length;
    expect(afterCalls).toBe(beforeCalls);
  });
});
