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

  beforeEach(() => {
    ryuCho = new RyuCho(mockConfig);
    vi.clearAllMocks();
  });

  describe('commit processing', () => {
    const mockFeed = {
      link: 'commit-link',
      title: 'commit title',
      contentSnippet: 'commit message',
      isoDate: '2024-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      vi.mocked(ryuCho.github.getLatestRun).mockResolvedValue({
        created_at: '2023-12-31T00:00:00.000Z',
      } as any);
      vi.mocked(ryuCho.rss.get).mockResolvedValue([mockFeed] as any);
      vi.mocked(ryuCho.github.getCommit).mockResolvedValue({
        data: {
          files: [{ filename: 'docs/test.md' }],
        },
      } as any);
      vi.mocked(ryuCho.repo.branchExists).mockReturnValue(false);
      vi.mocked(ryuCho.github.searchIssue).mockResolvedValue({
        data: { total_count: 0 },
      } as any);
      vi.mocked(ryuCho.github.createIssue).mockResolvedValue({
        data: { number: 1, html_url: 'issue-url' },
      } as any);
      vi.mocked(ryuCho.repo.hasConflicts).mockReturnValue(false);
      vi.mocked(ryuCho.github.createPullRequest).mockResolvedValue({
        data: { html_url: 'pr-url' },
      } as any);
    });

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
  });
});
