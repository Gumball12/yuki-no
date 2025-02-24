import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YukiNo } from '../src/yuki-no';
import type { Config } from '../src/config';
import { afterEach } from 'node:test';

vi.mock('../src/github', () => ({
  GitHub: vi.fn(() => ({
    getLatestRun: vi.fn(),
    getCommit: vi.fn(),
    searchIssue: vi.fn(),
    createIssue: vi.fn(),
    getOpenIssues: vi.fn(),
    getIssueComments: vi.fn(),
    createComment: vi.fn(),
    setLabels: vi.fn(),
    batchSearchIssues: vi.fn().mockResolvedValue({
      exists: {},
      metadata: {
        totalCount: 0,
        incompleteResults: false,
        apiQuotaRemaining: 30,
      },
    }),
  })),
}));

vi.mock('../src/repository', () => ({
  Repository: vi.fn(() => ({
    setup: vi.fn(),
    getReleaseInfo: vi.fn(),
    git: {
      fetch: vi.fn(),
      exec: vi.fn(),
    },
  })),
}));

let yukiNo: YukiNo;
const mockConfig: Config = {
  userName: 'test-user',
  email: 'test@example.com',
  accessToken: 'test-token',
  trackFrom: 'test-hash',
  include: [],
  exclude: [],
  labels: [],
  releaseTracking: false,
  releaseTrackingLabels: [],
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
  verbose: false,
};

/**
 * Sets up all necessary mocks for testing YukiNo
 *
 * This function mocks all external dependencies:
 * - GitHub API calls (getLatestRun, getCommit, searchIssue, createIssue)
 * - Repository operations and Git commands
 *
 * Default mock behavior:
 * - Sets last run date to Dec 31, 2023 (commits after this date are "new")
 * - Simulates a commit that modified a file in docs/
 * - No existing issues found
 * - Git operations succeed with test data
 */
function setupMocks(instance: YukiNo) {
  // Mock GitHub API calls
  vi.mocked(instance.github.getLatestRun).mockResolvedValue({
    created_at: '2023-12-31T00:00:00.000Z',
  } as any);
  vi.mocked(instance.github.getCommit).mockResolvedValue({
    data: {
      files: [{ filename: 'docs/test.md' }],
    },
  } as any);
  vi.mocked(instance.github.searchIssue).mockResolvedValue({
    data: { total_count: 0 },
  } as any);
  vi.mocked(instance.github.createIssue).mockResolvedValue({
    data: { number: 1, html_url: 'issue-url' },
  } as any);
  vi.mocked(instance.github.getIssueComments).mockResolvedValue([]);
  vi.mocked(instance.github.createComment).mockResolvedValue();
  vi.mocked(instance.github.setLabels).mockResolvedValue();

  // Default git operation mocks
  vi.mocked(instance.repo.git.fetch).mockReturnValue({
    stdout: '',
    stderr: '',
    code: 0,
  } as any);
  vi.mocked(instance.repo.git.exec).mockReturnValue({
    stdout: 'hash1|feat: test commit|2024-01-01T10:00:00+00:00\n',
    stderr: '',
    code: 0,
  } as any);
  vi.mocked(yukiNo.github.batchSearchIssues).mockResolvedValue({
    exists: { hash1: false },
    metadata: {
      totalCount: 0,
      incompleteResults: false,
      apiQuotaRemaining: 30,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  yukiNo = new YukiNo(mockConfig);
  setupMocks(yukiNo);
});

describe('Commit Processing', () => {
  it('should process new commits and create issues', async () => {
    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: 'hash1|feat: test commit|2024-01-01T10:00:00+00:00\n',
      stderr: '',
      code: 0,
    } as any);

    vi.mocked(yukiNo.github.batchSearchIssues).mockResolvedValue({
      exists: { hash1: false },
      metadata: {
        totalCount: 0,
        incompleteResults: false,
        apiQuotaRemaining: 30,
      },
    });

    await yukiNo.start();
    expect(yukiNo.github.createIssue).toHaveBeenCalled();
  });

  it('should skip commits older than last successful run', async () => {
    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: 'hash1|feat: old commit|2023-12-30T10:00:00+00:00\n',
      stderr: '',
      code: 0,
    } as any);

    vi.mocked(yukiNo.github.getLatestRun).mockResolvedValue({
      created_at: '2023-12-31T00:00:00.000Z',
    } as any);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).not.toHaveBeenCalled();
  });

  it('should process commits newer than last successful run', async () => {
    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: 'hash1|feat: new commit|2024-01-02T10:00:00+00:00\n',
      stderr: '',
      code: 0,
    } as any);

    vi.mocked(yukiNo.github.getLatestRun).mockResolvedValue({
      created_at: '2024-01-01T00:00:00.000Z',
    } as any);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).toHaveBeenCalled();
  });

  it('should process all commits when no previous run exists', async () => {
    vi.mocked(yukiNo.github.getLatestRun).mockResolvedValue(undefined as any);
    await yukiNo.start();
    expect(yukiNo.github.createIssue).toHaveBeenCalled();
  });

  it('should skip when issue already exists', async () => {
    vi.mocked(yukiNo.github.batchSearchIssues).mockResolvedValue({
      exists: { hash1: true }, // Issue already exists
      metadata: {
        totalCount: 1,
        incompleteResults: false,
        apiQuotaRemaining: 30,
      },
    });

    await yukiNo.start();
    expect(yukiNo.github.createIssue).not.toHaveBeenCalled();
  });

  it('should process multiple commits in chronological order', async () => {
    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: [
        'hash1|feat: first commit|2024-01-01T10:00:00+00:00',
        'hash2|feat: second commit|2024-01-01T11:00:00+00:00',
      ].join('\n'),
      stderr: '',
      code: 0,
    } as any);

    vi.mocked(yukiNo.github.batchSearchIssues).mockResolvedValue({
      exists: {
        hash1: false,
        hash2: false,
      },
      metadata: {
        totalCount: 0,
        incompleteResults: false,
        apiQuotaRemaining: 30,
      },
    });

    await yukiNo.start();
    const calls = vi.mocked(yukiNo.github.createIssue).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1].title).toBe('feat: first commit');
    expect(calls[1][1].title).toBe('feat: second commit');
  });
});

describe('Error Handling', () => {
  it('should handle git fetch failure gracefully', async () => {
    vi.mocked(yukiNo.repo.git.fetch).mockReturnValue({
      stdout: '',
      stderr: 'error: could not fetch',
      code: 1,
    } as any);

    vi.mocked(yukiNo.github.batchSearchIssues).mockResolvedValue({
      exists: { hash1: false },
      metadata: {
        totalCount: 0,
        incompleteResults: false,
        apiQuotaRemaining: 30,
      },
    });

    await yukiNo.start();
    expect(yukiNo.github.createIssue).toHaveBeenCalled();
  });

  it('should handle empty git log', async () => {
    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: '',
      stderr: '',
      code: 0,
    } as any);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).not.toHaveBeenCalled();
  });

  it('should handle malformed git log', async () => {
    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: 'invalid|output|format\n',
      stderr: '',
      code: 0,
    } as any);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).not.toHaveBeenCalled();
  });
});

describe('Issue Labels', () => {
  it('should use provided labels when specified', async () => {
    yukiNo = new YukiNo({
      ...mockConfig,
      labels: ['label1', 'label2', 'label3'],
    });
    setupMocks(yukiNo);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ labels: ['label1', 'label2', 'label3'] }),
    );
  });

  it('should not add any labels when empty string provided', async () => {
    yukiNo = new YukiNo({ ...mockConfig, labels: [] });
    setupMocks(yukiNo);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ labels: [] }),
    );
  });
});

describe('Release Tracking', () => {
  beforeEach(() => {
    yukiNo = new YukiNo({ ...mockConfig, releaseTracking: true });
    setupMocks(yukiNo);
  });

  it('should skip when release tracking is disabled', async () => {
    yukiNo.config.releaseTracking = false;
    await yukiNo.start();
    expect(yukiNo.github.getOpenIssues).not.toHaveBeenCalled();
  });

  it('should process open issues with sync label', async () => {
    const mockIssue = {
      number: 1,
      title: 'Test Issue',
      body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/1234567',
      state: 'open' as const,
      labels: ['sync'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(yukiNo.github.getOpenIssues).mockResolvedValue([mockIssue]);
    vi.mocked(yukiNo.github.getIssueComments).mockResolvedValue([]);
    vi.mocked(yukiNo.repo.getReleaseInfo).mockReturnValue({});

    await yukiNo.start();
    expect(yukiNo.github.createComment).toHaveBeenCalledWith(
      expect.anything(),
      1,
      '- pre-release: none\n- release: none',
    );
  });

  it('should skip non-matching label issues', async () => {
    const issue = {
      number: 1,
      title: 'Test Issue',
      body: 'Some content',
      state: 'open' as const,
      labels: ['other'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(yukiNo.github.getOpenIssues).mockResolvedValue([issue]);
    await yukiNo.start();
    expect(yukiNo.github.getIssueComments).not.toHaveBeenCalled();
  });
});

describe('Release Status Updates', () => {
  beforeEach(() => {
    yukiNo = new YukiNo({ ...mockConfig, releaseTracking: true });
    setupMocks(yukiNo);
  });

  it('should update when new pre-release is available', async () => {
    const mockIssue = {
      number: 1,
      title: 'Test Issue',
      body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/1234567',
      state: 'open' as const,
      labels: ['sync'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const existingComment = {
      id: 1,
      body: '- pre-release: [v1.0.0-beta.1](pre-url-1)\n- release: none',
      user: { login: 'test-user' },
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(yukiNo.github.getOpenIssues).mockResolvedValue([mockIssue]);
    vi.mocked(yukiNo.github.getIssueComments).mockResolvedValue([
      existingComment,
    ]);
    vi.mocked(yukiNo.repo.getReleaseInfo).mockReturnValue({
      preRelease: { tag: 'v1.0.0-beta.2', url: 'pre-url-2' },
    });

    await yukiNo.start();
    expect(yukiNo.github.createComment).toHaveBeenCalledWith(
      expect.anything(),
      1,
      '- pre-release: [v1.0.0-beta.2](pre-url-2)\n- release: none',
    );
  });

  it('should update when final release is available', async () => {
    const mockIssue = {
      number: 1,
      title: 'Test Issue',
      body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/1234567',
      state: 'open' as const,
      labels: ['sync'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const existingComment = {
      id: 1,
      body: '- pre-release: [v1.0.0-beta.2](pre-url-2)\n- release: none',
      user: { login: 'test-user' },
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(yukiNo.github.getOpenIssues).mockResolvedValue([mockIssue]);
    vi.mocked(yukiNo.github.getIssueComments).mockResolvedValue([
      existingComment,
    ]);
    vi.mocked(yukiNo.repo.getReleaseInfo).mockReturnValue({
      preRelease: { tag: 'v1.0.0-beta.2', url: 'pre-url-2' },
      release: { tag: 'v1.0.0', url: 'release-url' },
    });

    await yukiNo.start();
    expect(yukiNo.github.createComment).toHaveBeenCalledWith(
      expect.anything(),
      1,
      '- pre-release: [v1.0.0-beta.2](pre-url-2)\n- release: [v1.0.0](release-url)',
    );
  });

  it('should skip update when versions are identical', async () => {
    const mockIssue = {
      number: 1,
      title: 'Test Issue',
      body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/1234567',
      state: 'open' as const,
      labels: ['sync'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const existingComment = {
      id: 1,
      body: '- pre-release: [v1.0.0-beta.2](pre-url-2)\n- release: [v1.0.0](release-url)',
      user: { login: 'test-user' },
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(yukiNo.github.getOpenIssues).mockResolvedValue([mockIssue]);
    vi.mocked(yukiNo.github.getIssueComments).mockResolvedValue([
      existingComment,
    ]);
    vi.mocked(yukiNo.repo.getReleaseInfo).mockReturnValue({
      preRelease: { tag: 'v1.0.0-beta.2', url: 'pre-url-2' },
      release: { tag: 'v1.0.0', url: 'release-url' },
    });

    await yukiNo.start();
    expect(yukiNo.github.createComment).not.toHaveBeenCalled();
  });
});

describe('Comment Formatting', () => {
  it('should format empty release info', () => {
    const comment = yukiNo.formatReleaseComment({});
    expect(comment).toBe('- pre-release: none\n- release: none');
  });

  it('should format pre-release only', () => {
    const comment = yukiNo.formatReleaseComment({
      preRelease: { tag: 'v1.0.0-beta.1', url: 'pre-url' },
    });
    expect(comment).toBe(
      '- pre-release: [v1.0.0-beta.1](pre-url)\n- release: none',
    );
  });

  it('should format both pre-release and release', () => {
    const comment = yukiNo.formatReleaseComment({
      preRelease: { tag: 'v1.0.0-beta.1', url: 'pre-url' },
      release: { tag: 'v1.0.0', url: 'release-url' },
    });
    expect(comment).toBe(
      '- pre-release: [v1.0.0-beta.1](pre-url)\n- release: [v1.0.0](release-url)',
    );
  });
});

describe('Release Tracking Labels', () => {
  beforeEach(() => {
    yukiNo = new YukiNo({
      ...mockConfig,
      releaseTracking: true,
      releaseTrackingLabels: ['pending', 'unreleased'],
    });
    setupMocks(yukiNo);
  });

  it('should not add labels when release tracking labels is empty string', async () => {
    yukiNo = new YukiNo({
      ...mockConfig,
      releaseTracking: true,
      releaseTrackingLabels: [],
    });
    setupMocks(yukiNo);

    const issue = {
      number: 1,
      title: 'Test Issue',
      body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/1234567',
      state: 'open' as const,
      labels: ['sync'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(yukiNo.github.getOpenIssues).mockResolvedValue([issue]);
    vi.mocked(yukiNo.repo.getReleaseInfo).mockReturnValue({});

    await yukiNo.start();
    expect(yukiNo.github.setLabels).not.toHaveBeenCalled();
  });

  it('should not modify labels when release tracking labels match issue labels', async () => {
    const issue = {
      number: 1,
      title: 'Test Issue',
      body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/1234567',
      state: 'open' as const,
      labels: ['sync', 'pending', 'unreleased'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(yukiNo.github.getOpenIssues).mockResolvedValue([issue]);
    vi.mocked(yukiNo.repo.getReleaseInfo).mockReturnValue({});

    await yukiNo.start();
    expect(yukiNo.github.setLabels).not.toHaveBeenCalled();
  });

  it('should add tracking labels for unreleased changes', async () => {
    const issue = {
      number: 1,
      title: 'Test Issue',
      body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/1234567',
      state: 'open' as const,
      labels: ['sync'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(yukiNo.github.getOpenIssues).mockResolvedValue([issue]);
    vi.mocked(yukiNo.repo.getReleaseInfo).mockReturnValue({});

    await yukiNo.start();
    expect(yukiNo.github.setLabels).toHaveBeenCalledWith(
      expect.anything(),
      1,
      expect.arrayContaining(['sync', 'pending', 'unreleased']),
    );
  });

  it('should remove tracking labels when released', async () => {
    const issue = {
      number: 1,
      title: 'Test Issue',
      body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/1234567',
      state: 'open' as const,
      labels: ['sync', 'pending', 'unreleased'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(yukiNo.github.getOpenIssues).mockResolvedValue([issue]);
    vi.mocked(yukiNo.repo.getReleaseInfo).mockReturnValue({
      release: { tag: 'v1.0.0', url: 'release-url' },
    });

    await yukiNo.start();
    expect(yukiNo.github.setLabels).toHaveBeenCalledWith(expect.anything(), 1, [
      'sync',
    ]);
  });

  it('should filter out duplicate labels between issue labels and release tracking labels', async () => {
    yukiNo = new YukiNo({
      ...mockConfig,
      releaseTracking: true,
      labels: ['sync', 'pending'],
      releaseTrackingLabels: ['pending', 'unreleased'],
    });
    setupMocks(yukiNo);

    const issue = {
      number: 1,
      title: 'Test Issue',
      body: 'New updates on head repo.\r\nhttps://github.com/test/test/commit/1234567',
      state: 'open' as const,
      labels: ['sync', 'pending'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(yukiNo.github.getOpenIssues).mockResolvedValue([issue]);
    vi.mocked(yukiNo.repo.getReleaseInfo).mockReturnValue({});

    await yukiNo.start();
    expect(yukiNo.github.setLabels).toHaveBeenCalledWith(
      expect.anything(),
      1,
      expect.arrayContaining(['sync', 'pending', 'unreleased']),
    );
  });
});

describe('File Pattern Matching', () => {
  it('should include all files when no patterns specified', async () => {
    yukiNo = new YukiNo({ ...mockConfig, include: [], exclude: [] });
    setupMocks(yukiNo);

    vi.mocked(yukiNo.github.getCommit).mockResolvedValue({
      data: { files: [{ filename: 'any/path/file.md' }] },
    } as any);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).toHaveBeenCalled();
  });

  it('should include files matching include pattern', async () => {
    yukiNo = new YukiNo({
      ...mockConfig,
      include: ['docs/**/*.md', 'src/**/*.ts'],
    });
    setupMocks(yukiNo);

    vi.mocked(yukiNo.github.getCommit).mockResolvedValue({
      data: { files: [{ filename: 'docs/guide/intro.md' }] },
    } as any);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).toHaveBeenCalled();
  });

  it('should exclude files matching exclude pattern', async () => {
    yukiNo = new YukiNo({
      ...mockConfig,
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts'],
    });
    setupMocks(yukiNo);
    vi.mocked(yukiNo.github.getCommit).mockResolvedValue({
      data: { files: [{ filename: 'src/utils.test.ts' }] },
    } as any);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).not.toHaveBeenCalled();
  });

  it('should prioritize exclude over include patterns', async () => {
    yukiNo = new YukiNo({
      ...mockConfig,
      include: ['src/**/*.ts'],
      exclude: ['src/excluded/**'],
    });
    setupMocks(yukiNo);
    vi.mocked(yukiNo.github.getCommit).mockResolvedValue({
      data: { files: [{ filename: 'src/excluded/file.ts' }] },
    } as any);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).not.toHaveBeenCalled();
  });
});

describe('Commit Hash Extraction', () => {
  it('should extract valid 40-character commit hash from GitHub URL', () => {
    const body =
      'https://github.com/test/test/commit/1234567890abcdef1234567890abcdef12345678';
    const hash = yukiNo.extractCommitHash(body);
    expect(hash).toBe('1234567890abcdef1234567890abcdef12345678');
  });

  it('should extract valid 7-character short commit hash from GitHub URL', () => {
    const body = 'https://github.com/test/test/commit/1234567';
    const hash = yukiNo.extractCommitHash(body);
    expect(hash).toBe('1234567');
  });

  it('should extract commit hash regardless of surrounding text', () => {
    const bodies = [
      'New updates on head repo.\nhttps://github.com/test/test/commit/1234567',
      'Previous translation process: https://github.com/test/test/commit/1234567',
      'Random text before https://github.com/test/test/commit/1234567 and after',
      'Multiple lines\nwith commit\nhttps://github.com/test/test/commit/1234567\nand more text',
    ];

    for (const body of bodies) {
      const hash = yukiNo.extractCommitHash(body);
      expect(hash).toBe('1234567');
    }
  });

  it('should return undefined for invalid GitHub URL format', () => {
    const body = 'https://not-github.com/test/test/commit/1234567';
    const hash = yukiNo.extractCommitHash(body);
    expect(hash).toBeUndefined();
  });

  it('should return undefined for invalid commit hash format', () => {
    const invalidHashes = [
      'https://github.com/test/test/commit/123456', // Too short (6 chars)
      'https://github.com/test/test/commit/12345678', // Invalid length (8 chars)
      'https://github.com/test/test/commit/123456g', // Invalid character
    ];

    for (const body of invalidHashes) {
      const hash = yukiNo.extractCommitHash(body);
      expect(hash).toBeUndefined();
    }
  });

  it('should return undefined when no commit URL is present', () => {
    const body = 'Some text without commit URL';
    const hash = yukiNo.extractCommitHash(body);
    expect(hash).toBeUndefined();
  });
});

describe('Commit URL Formatting', () => {
  it('should format commit URL correctly without .git extension', async () => {
    yukiNo = new YukiNo({
      ...mockConfig,
      remote: {
        ...mockConfig.remote,
        head: {
          url: 'https://github.com/test/repo.dev.git',
          owner: 'test',
          name: 'repo',
          branch: 'main',
        },
      },
    });
    setupMocks(yukiNo);

    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: 'hash1|feat: test commit|2024-01-01T10:00:00+00:00\n',
      stderr: '',
      code: 0,
    } as any);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.stringContaining(
          'https://github.com/test/repo.dev/commit/',
        ),
      }),
    );
  });

  it('should handle URLs without .git extension correctly', async () => {
    yukiNo = new YukiNo({
      ...mockConfig,
      remote: {
        ...mockConfig.remote,
        head: {
          url: 'https://github.com/test/repo',
          owner: 'test',
          name: 'repo',
          branch: 'main',
        },
      },
    });
    setupMocks(yukiNo);

    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: 'hash1|feat: test commit|2024-01-01T10:00:00+00:00\n',
      stderr: '',
      code: 0,
    } as any);

    await yukiNo.start();
    expect(yukiNo.github.createIssue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.stringContaining('https://github.com/test/repo/commit/'),
      }),
    );
  });
});

describe('Batch Processing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should process commits in batches', async () => {
    // Multiple commits setup
    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: [
        'hash1|feat: commit 1|2024-01-01T10:00:00+00:00',
        'hash2|feat: commit 2|2024-01-01T11:00:00+00:00',
        'hash3|feat: commit 3|2024-01-01T12:00:00+00:00',
        'hash4|feat: commit 4|2024-01-01T13:00:00+00:00',
        'hash5|feat: commit 5|2024-01-01T14:00:00+00:00',
        'hash6|feat: commit 5|2024-01-01T14:00:00+00:00',
      ].join('\n'),
      stderr: '',
      code: 0,
    } as any);

    // Mock batch search results
    vi.mocked(yukiNo.github.batchSearchIssues).mockResolvedValue({
      exists: {
        hash1: true, // Already exists
        hash2: false, // New issue needed
        hash3: true, // Already exists
        hash4: false, // New issue needed
        hash5: false, // New issue needed
        hash6: true, // Already exists
      },
      metadata: {
        totalCount: 2,
        incompleteResults: false,
        apiQuotaRemaining: 28,
      },
    });

    yukiNo.start();
    await vi.advanceTimersByTimeAsync(3000); // yukiNo.batchConfig.delayMs

    // Verify batch processing
    expect(yukiNo.github.batchSearchIssues).toHaveBeenCalledTimes(2);
    expect(yukiNo.github.createIssue).toHaveBeenCalledTimes(3);
  });

  it('throw an exception when reach API rate limits', async () => {
    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: [
        ...Array(6)
          .fill(0)
          .map(() => 'hash1|feat: commit 1|2024-01-01T10:00:00+00:00'),
      ].join('\n'),
      stderr: '',
      code: 0,
    } as any);

    vi.mocked(yukiNo.github.batchSearchIssues)
      .mockRejectedValueOnce({
        status: 403,
        message: 'API rate limit exceeded',
        response: { headers: { 'x-ratelimit-remaining': '0' } },
      })
      .mockResolvedValueOnce({
        exists: { hash1: false },
        metadata: {
          apiQuotaRemaining: 29,
          totalCount: 0,
          incompleteResults: false,
        },
      });

    await expect(async () => await yukiNo.start()).rejects.toThrowError();
  });

  it('should track processing metrics', async () => {
    const mockLog = vi.spyOn(console, 'info'); // Changed from log to info

    vi.mocked(yukiNo.repo.git.exec).mockReturnValue({
      stdout: [
        'hash1|feat: commit 1|2024-01-01T10:00:00+00:00',
        'hash2|feat: commit 2|2024-01-01T11:00:00+00:00',
      ].join('\n'),
      stderr: '',
      code: 0,
    } as any);

    vi.mocked(yukiNo.github.batchSearchIssues).mockResolvedValue({
      exists: {
        hash1: false,
        hash2: false,
      },
      metadata: {
        totalCount: 0,
        incompleteResults: false,
        apiQuotaRemaining: 30,
      },
    });

    process.env.VERBOSE = 'true'; // Enable verbose logging
    await yukiNo.start();
    process.env.VERBOSE = 'false'; // Reset verbose logging

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Progress:'));
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining('Estimated time remaining:'),
    );
  });
});
