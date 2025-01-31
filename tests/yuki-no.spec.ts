import { describe, it, expect, vi, beforeEach } from 'vitest'
import { YukiNo } from '../src/yuki-no'
import { type Config } from '../src/config'

// Mock GitHub API responses
vi.mock('../src/github', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    // Mock searchIssue to return no existing issues by default
    searchIssue: vi.fn().mockResolvedValue({
      data: { total_count: 0, items: [] }
    }),
    // Mock getCommits to return a test commit
    getCommits: vi.fn().mockResolvedValue({
      data: [
        {
          sha: 'abc123',
          commit: { message: 'test commit' },
          html_url: 'https://github.com/test/repo/commit/abc123',
          files: [{ filename: 'docs/test.md' }]
        }
      ]
    }),
    // Mock issue creation response
    createIssue: vi.fn().mockResolvedValue({
      data: { html_url: 'https://github.com/test/repo/issues/1' }
    })
  }))
}))

describe('YukiNo', () => {
  let yukiNo: YukiNo
  let mockConfig: Config

  beforeEach(() => {
    mockConfig = {
      userName: 'test',
      email: 'test@example.com',
      accessToken: 'token',
      initialCommit: 'initial123',
      pathStartsWith: 'docs/',
      remote: {
        upstream: {
          url: 'https://github.com/test/upstream.git',
          owner: 'test',
          name: 'upstream',
          branch: 'main'
        },
        head: {
          url: 'https://github.com/test/head.git',
          owner: 'test',
          name: 'head',
          branch: 'main'
        }
      }
    }
    yukiNo = new YukiNo(mockConfig)
    vi.clearAllMocks()
  })

  describe('syncChanges', () => {
    it('should process single new commit and create issue', async () => {
      await yukiNo.start()

      expect(yukiNo.github.getCommits).toHaveBeenCalledWith(
        mockConfig.remote.upstream,
        mockConfig.initialCommit
      )

      expect(yukiNo.github.createIssue).toHaveBeenCalledWith(
        mockConfig.remote.head,
        expect.objectContaining({
          title: expect.stringContaining('[Sync]'),
          body: expect.stringContaining('Commit: abc123'),
          labels: ['sync']
        })
      )
    })

    it('should process multiple commits in order', async () => {
      // Mock multiple commits
      yukiNo.github.getCommits = vi.fn().mockResolvedValue({
        data: [
          {
            sha: 'abc123',
            commit: { message: 'feat: new feature' },
            html_url: 'https://github.com/test/repo/commit/abc123',
            files: [{ filename: 'docs/guide.md' }]
          },
          {
            sha: 'def456',
            commit: { message: 'docs: update guide' },
            html_url: 'https://github.com/test/repo/commit/def456',
            files: [{ filename: 'docs/guide.md' }]
          },
          {
            sha: 'ghi789',
            commit: { message: 'fix: typo' },
            html_url: 'https://github.com/test/repo/commit/ghi789',
            files: [{ filename: 'docs/guide.md' }]
          }
        ]
      })

      await yukiNo.start()

      // Verify all commits were processed in order
      expect(yukiNo.github.createIssue).toHaveBeenCalledTimes(3)

      // First commit
      expect(yukiNo.github.createIssue).toHaveBeenNthCalledWith(
        1,
        mockConfig.remote.head,
        expect.objectContaining({
          title: '[Sync] feat: new feature',
          body: expect.stringContaining('Commit: abc123'),
          labels: ['sync']
        })
      )

      // Second commit
      expect(yukiNo.github.createIssue).toHaveBeenNthCalledWith(
        2,
        mockConfig.remote.head,
        expect.objectContaining({
          title: '[Sync] docs: update guide',
          body: expect.stringContaining('Commit: def456'),
          labels: ['sync']
        })
      )

      // Third commit
      expect(yukiNo.github.createIssue).toHaveBeenNthCalledWith(
        3,
        mockConfig.remote.head,
        expect.objectContaining({
          title: '[Sync] fix: typo',
          body: expect.stringContaining('Commit: ghi789'),
          labels: ['sync']
        })
      )
    })

    it('should handle mixed commits with path filter', async () => {
      // Mock commits with mixed paths
      yukiNo.github.getCommits = vi.fn().mockResolvedValue({
        data: [
          {
            sha: 'abc123',
            commit: { message: 'feat: new feature' },
            html_url: 'https://github.com/test/repo/commit/abc123',
            files: [{ filename: 'docs/guide.md' }]
          },
          {
            sha: 'def456',
            commit: { message: 'chore: update deps' },
            html_url: 'https://github.com/test/repo/commit/def456',
            files: [{ filename: 'package.json' }]
          },
          {
            sha: 'ghi789',
            commit: { message: 'docs: update guide' },
            html_url: 'https://github.com/test/repo/commit/ghi789',
            files: [{ filename: 'docs/guide.md' }]
          }
        ]
      })

      await yukiNo.start()

      // Verify only docs-related commits were processed
      expect(yukiNo.github.createIssue).toHaveBeenCalledTimes(2)

      // First docs commit
      expect(yukiNo.github.createIssue).toHaveBeenNthCalledWith(
        1,
        mockConfig.remote.head,
        expect.objectContaining({
          title: '[Sync] feat: new feature',
          body: expect.stringContaining('Commit: abc123'),
          labels: ['sync']
        })
      )

      // Second docs commit
      expect(yukiNo.github.createIssue).toHaveBeenNthCalledWith(
        2,
        mockConfig.remote.head,
        expect.objectContaining({
          title: '[Sync] docs: update guide',
          body: expect.stringContaining('Commit: ghi789'),
          labels: ['sync']
        })
      )
    })

    it('should handle existing sync issues', async () => {
      // Mock existing sync issue
      yukiNo.github.searchIssue = vi
        .fn()
        .mockResolvedValueOnce({
          // First call for last sync state
          data: {
            total_count: 1,
            items: [
              {
                body: 'Commit: def456\n'
              }
            ]
          }
        })
        .mockResolvedValue({
          // Subsequent calls for duplicate checks
          data: { total_count: 0, items: [] }
        })

      // Mock new commits after def456
      yukiNo.github.getCommits = vi.fn().mockResolvedValue({
        data: [
          {
            sha: 'ghi789',
            commit: { message: 'docs: new changes' },
            html_url: 'https://github.com/test/repo/commit/ghi789',
            files: [{ filename: 'docs/guide.md' }]
          }
        ]
      })

      await yukiNo.start()

      // Verify getCommits was called with the last sync commit
      expect(yukiNo.github.getCommits).toHaveBeenCalledWith(
        mockConfig.remote.upstream,
        'def456'
      )

      // Verify only new commit was processed
      expect(yukiNo.github.createIssue).toHaveBeenCalledTimes(1)
      expect(yukiNo.github.createIssue).toHaveBeenCalledWith(
        mockConfig.remote.head,
        expect.objectContaining({
          title: '[Sync] docs: new changes',
          body: expect.stringContaining('Commit: ghi789'),
          labels: ['sync']
        })
      )
    })
  })

  describe('getLastSyncCommit', () => {
    it('should return initial commit if no sync state exists', async () => {
      // Test when no sync state issue exists
      const commit = await yukiNo.getLastSyncCommit()
      expect(commit).toBe(mockConfig.initialCommit)
    })

    it('should return last synced commit from issue', async () => {
      // Mock existing sync state issue
      yukiNo.github.searchIssue = vi.fn().mockResolvedValue({
        data: {
          total_count: 1,
          items: [
            {
              body: 'Commit: def456\nUpdated at: 2024-01-01T00:00:00.000Z'
            }
          ]
        }
      })

      // Verify correct commit hash is extracted
      const commit = await yukiNo.getLastSyncCommit()
      expect(commit).toBe('def456')
    })
  })
})
