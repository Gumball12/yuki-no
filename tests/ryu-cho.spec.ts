import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RyuCho } from '../src/ryu-cho';
import type { Config } from '../src/config';

vi.mock('../src/rss', () => ({
  Rss: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

vi.mock('../src/github', () => ({
  GitHub: vi.fn(() => ({
    getLatestRun: vi.fn(),
    getCommit: vi.fn(),
    searchIssue: vi.fn(),
    createIssue: vi.fn(),
    createPullRequest: vi.fn(),
    getOpenIssues: vi.fn(),
    getIssueComments: vi.fn(),
    createComment: vi.fn(),
  })),
}));

vi.mock('../src/repository', () => ({
  Repository: vi.fn(() => ({
    setup: vi.fn(),
    fetchHead: vi.fn(),
    branchExists: vi.fn(),
    checkoutDefaultBranch: vi.fn(),
    createBranch: vi.fn(),
    hasConflicts: vi.fn(),
    reset: vi.fn(),
    updateRemote: vi.fn(),
    getReleaseInfo: vi.fn(),
  })),
}));

describe('RyuCho', () => {
  let ryuCho: RyuCho;
  const mockConfig: Config = {
    userName: 'test-user',
    email: 'test@example.com',
    accessToken: 'test-token',
    trackFrom: 'test-hash',
    pathStartsWith: 'docs/',
    releaseTracking: false,
    remote: {
      upstream: {
        url: 'https://github.com/test/upstream.git',
        owner: 'test',
        name: 'upstream',
        branch: 'main',
      },
      head: {
        url: 'https://github.com/test/head.git',
        owner: 'test',
        name: 'head',
        branch: 'main',
      },
    },
  };

  const mockFeed = {
    link: 'commit-link',
    title: 'commit title',
    contentSnippet: 'commit message',
    isoDate: '2024-01-01T00:00:00.000Z',
  };

  /**
   * Sets up all necessary mocks for testing RyuCho
   *
   * This function mocks all external dependencies:
   * - GitHub API calls (getLatestRun, getCommit, searchIssue, createIssue, createPullRequest)
   * - Repository operations (branchExists, hasConflicts)
   * - RSS feed fetching
   *
   * Default mock behavior:
   * - Sets last run date to Dec 31, 2023 (commits after this date are "new")
   * - Returns a single mock feed item
   * - Simulates a commit that modified a file in docs/
   * - Branch doesn't exist (allows new branch creation)
   * - No existing issues found
   * - No merge conflicts
   *
   * @param instance - RyuCho instance to mock
   */
  function setupMocks(instance: RyuCho) {
    vi.mocked(instance.github.getLatestRun).mockResolvedValue({
      created_at: '2023-12-31T00:00:00.000Z',
    } as any);
    vi.mocked(instance.rss.get).mockResolvedValue([mockFeed] as any);
    vi.mocked(instance.github.getCommit).mockResolvedValue({
      data: {
        files: [{ filename: 'docs/test.md' }],
      },
    } as any);
    vi.mocked(instance.repo.branchExists).mockReturnValue(false);
    vi.mocked(instance.github.searchIssue).mockResolvedValue({
      data: { total_count: 0 },
    } as any);
    vi.mocked(instance.github.createIssue).mockResolvedValue({
      data: { number: 1, html_url: 'issue-url' },
    } as any);
    vi.mocked(instance.repo.hasConflicts).mockReturnValue(false);
    vi.mocked(instance.github.createPullRequest).mockResolvedValue({
      data: { html_url: 'pr-url' },
    } as any);
    vi.mocked(instance.github.createComment).mockResolvedValue();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    ryuCho = new RyuCho(mockConfig);
    setupMocks(ryuCho);
  });

  describe('commit processing', () => {
    it('should process new commit and create PR', async () => {
      await ryuCho.start();

      expect(ryuCho.repo.setup).toHaveBeenCalled();
      expect(ryuCho.github.createIssue).toHaveBeenCalled();
      expect(ryuCho.github.createPullRequest).toHaveBeenCalled();
    });

    it('should skip processing when commit is too old', async () => {
      vi.mocked(ryuCho.github.getLatestRun).mockResolvedValue({
        created_at: '2024-01-02T00:00:00.000Z',
      } as any);

      await ryuCho.start();

      expect(ryuCho.github.createIssue).not.toHaveBeenCalled();
      expect(ryuCho.github.createPullRequest).not.toHaveBeenCalled();
    });

    it('should handle merge conflicts', async () => {
      vi.mocked(ryuCho.repo.hasConflicts).mockReturnValue(true);

      await ryuCho.start();

      expect(ryuCho.repo.reset).toHaveBeenCalled();
      expect(ryuCho.github.createPullRequest).not.toHaveBeenCalled();
    });

    describe('issue labels', () => {
      it('should use default sync label when labels not provided', async () => {
        await ryuCho.start();

        expect(ryuCho.github.createIssue).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            labels: ['sync'],
          }),
        );
      });

      it('should use provided labels when specified', async () => {
        const configWithLabels = {
          ...mockConfig,
          labels: 'label1\nlabel2\nlabel3',
        };
        ryuCho = new RyuCho(configWithLabels);
        setupMocks(ryuCho);

        await ryuCho.start();

        expect(ryuCho.github.createIssue).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            labels: ['label1', 'label2', 'label3'],
          }),
        );
      });

      it('should not add any labels when empty string provided', async () => {
        const configWithEmptyLabels = {
          ...mockConfig,
          labels: '',
        };
        ryuCho = new RyuCho(configWithEmptyLabels);
        setupMocks(ryuCho);

        await ryuCho.start();

        expect(ryuCho.github.createIssue).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            labels: [],
          }),
        );
      });
    });
  });

  describe('release tracking', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      ryuCho = new RyuCho({
        ...mockConfig,
        releaseTracking: true,
      });
      setupMocks(ryuCho);
    });

    it('should skip when release tracking is disabled', async () => {
      ryuCho = new RyuCho({
        ...mockConfig,
        releaseTracking: false,
      });
      setupMocks(ryuCho);

      await ryuCho.start();

      expect(ryuCho.github.getOpenIssues).not.toHaveBeenCalled();
    });

    it('should process open issues when enabled', async () => {
      const mockIssue = {
        number: 1,
        title: 'Test Issue',
        body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/hash123',
        state: 'open' as const,
        user: { login: 'test-user' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(ryuCho.github.getOpenIssues).mockResolvedValue([mockIssue]);
      vi.mocked(ryuCho.github.getIssueComments).mockResolvedValue([]);
      vi.mocked(ryuCho.repo.getReleaseInfo).mockReturnValue({});

      await ryuCho.start();

      expect(ryuCho.github.createComment).toHaveBeenCalledWith(
        expect.anything(),
        1,
        '- pre-release: none\n- release: none',
      );
    });

    it('should update comment when new pre-release is available', async () => {
      const mockIssue = {
        number: 1,
        title: 'Test Issue',
        body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/hash123',
        state: 'open' as const,
        user: { login: 'test-user' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const existingComment = {
        id: 1,
        body: '- pre-release: [v1.0.0-beta.1](pre-url-1)\n- release: none',
        user: { login: 'test-user' },
        created_at: '2024-01-01T00:00:00Z',
      };

      ryuCho = new RyuCho({
        ...mockConfig,
        releaseTracking: true,
      });
      setupMocks(ryuCho);

      vi.mocked(ryuCho.github.getOpenIssues).mockResolvedValue([mockIssue]);
      vi.mocked(ryuCho.github.getIssueComments).mockResolvedValue([
        existingComment,
      ]);
      vi.mocked(ryuCho.repo.getReleaseInfo).mockReturnValue({
        preRelease: { tag: 'v1.0.0-beta.2', url: 'pre-url-2' },
      });

      await ryuCho.start();

      expect(ryuCho.github.createComment).toHaveBeenCalledWith(
        expect.anything(),
        1,
        '- pre-release: [v1.0.0-beta.2](pre-url-2)\n- release: none',
      );
    });

    it('should update comment when release is available', async () => {
      const mockIssue = {
        number: 1,
        title: 'Test Issue',
        body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/hash123',
        state: 'open' as const,
        user: { login: 'test-user' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const existingComment = {
        id: 1,
        body: '- pre-release: [v1.0.0-beta.2](pre-url-2)\n- release: none',
        user: { login: 'test-user' },
        created_at: '2024-01-01T00:00:00Z',
      };

      ryuCho = new RyuCho({
        ...mockConfig,
        releaseTracking: true,
      });
      setupMocks(ryuCho);

      vi.mocked(ryuCho.github.getOpenIssues).mockResolvedValue([mockIssue]);
      vi.mocked(ryuCho.github.getIssueComments).mockResolvedValue([
        existingComment,
      ]);
      vi.mocked(ryuCho.repo.getReleaseInfo).mockReturnValue({
        preRelease: { tag: 'v1.0.0-beta.2', url: 'pre-url-2' },
        release: { tag: 'v1.0.0', url: 'release-url' },
      });

      await ryuCho.start();

      expect(ryuCho.github.createComment).toHaveBeenCalledWith(
        expect.anything(),
        1,
        '- pre-release: [v1.0.0-beta.2](pre-url-2)\n- release: [v1.0.0](release-url)',
      );
    });

    it('should skip issue with full release comment', async () => {
      const mockIssue = {
        number: 1,
        title: 'Test Issue',
        body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/hash123',
        state: 'open' as const,
        user: { login: 'test-user' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockComment = {
        id: 1,
        body: '- pre-release: [v1.0.0-beta.1](url)\n- release: [v1.0.0](url)',
        user: { login: 'test-user' },
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(ryuCho.github.getOpenIssues).mockResolvedValue([mockIssue]);
      vi.mocked(ryuCho.github.getIssueComments).mockResolvedValue([
        mockComment,
      ]);

      await ryuCho.start();

      expect(ryuCho.github.createComment).not.toHaveBeenCalled();
    });

    describe('comment formatting', () => {
      it('should format when no releases', () => {
        const info = {};
        const comment = ryuCho.formatReleaseComment(info);
        expect(comment).toBe('- pre-release: none\n- release: none');
      });

      it('should format with pre-release only', () => {
        const info = {
          preRelease: { tag: 'v1.0.0-beta.1', url: 'pre-url' },
        };
        const comment = ryuCho.formatReleaseComment(info);
        expect(comment).toBe(
          '- pre-release: [v1.0.0-beta.1](pre-url)\n- release: none',
        );
      });

      it('should format with both pre-release and release', () => {
        const info = {
          preRelease: { tag: 'v1.0.0-beta.1', url: 'pre-url' },
          release: { tag: 'v1.0.0', url: 'release-url' },
        };
        const comment = ryuCho.formatReleaseComment(info);
        expect(comment).toBe(
          '- pre-release: [v1.0.0-beta.1](pre-url)\n- release: [v1.0.0](release-url)',
        );
      });

      it('should format with release only', () => {
        const info = {
          release: { tag: 'v1.0.0', url: 'release-url' },
        };
        const comment = ryuCho.formatReleaseComment(info);
        expect(comment).toBe(
          '- pre-release: none\n- release: [v1.0.0](release-url)',
        );
      });
    });
  });
});
