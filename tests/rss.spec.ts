import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Rss } from '../src/rss';
import type { Remote } from '../src/config';

vi.mock('rss-parser', () => ({
  default: vi.fn(() => ({
    parseURL: vi.fn(),
  })),
}));

let rss: Rss;
const mockRemote: Remote = {
  url: 'https://github.com/test/repo.git',
  owner: 'test',
  name: 'repo',
  branch: 'main',
};

beforeEach(() => {
  rss = new Rss();
  vi.clearAllMocks();
});

describe('get', () => {
  it('should filter feed items up to target commit', async () => {
    const mockFeed = {
      items: [
        { link: 'commit1' },
        { link: 'target-commit' },
        { link: 'commit3' },
      ],
    };

    vi.mocked(rss.api.parseURL).mockResolvedValue(mockFeed as any);

    const items = await rss.get(mockRemote, 'target-commit');

    expect(items).toHaveLength(2);
    expect(items[items.length - 1].link).toBe('target-commit');
  });

  it('should return all items when target commit is not found', async () => {
    const mockFeed = {
      items: [{ link: 'commit1' }, { link: 'commit2' }, { link: 'commit3' }],
    };

    vi.mocked(rss.api.parseURL).mockResolvedValue(mockFeed as any);

    const items = await rss.get(mockRemote, 'non-existent');

    expect(items).toEqual(mockFeed.items);
  });

  it('should handle empty feed', async () => {
    const mockFeed = { items: [] };
    vi.mocked(rss.api.parseURL).mockResolvedValue(mockFeed as any);

    const items = await rss.get(mockRemote, 'any-commit');

    expect(items).toEqual([]);
  });
});
