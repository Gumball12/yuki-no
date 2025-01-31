import { log } from './utils'
import { type Config, type Remote } from './config'
import { GitHub } from './github'

interface Commit {
  hash: string
  title: string
  link: string
  date: string
  files: string[]
}

export class YukiNo {
  config: Config
  upstream: Remote
  head: Remote
  github: GitHub

  constructor(config: Config) {
    this.config = config
    this.upstream = config.remote.upstream
    this.head = config.remote.head
    this.github = new GitHub(config.accessToken)
  }

  async start(): Promise<void> {
    await this.syncChanges()
  }

  async syncChanges() {
    const lastSyncCommit = await this.getLastSyncCommit()
    const commits = await this.getNewCommits(lastSyncCommit)

    for (const commit of commits) {
      if (await this.shouldProcessCommit(commit)) {
        await this.createIssue(commit)
        log('S', `Processed commit: "${commit.title}"`)
      }
    }
  }

  async getLastSyncCommit(): Promise<string> {
    try {
      // Find the most recent sync issue from the issue list
      const issues = await this.github.searchIssue(
        this.head,
        'is:issue label:sync'
      )

      // If issue exists, extract the commit hash from it
      if (issues.data.total_count > 0) {
        const body = issues.data.items[0].body || ''
        const match = body.match(/Commit: ([a-f0-9]+)/)

        if (match) {
          return match[1]
        }
      }
    } catch (error) {
      log('W', 'Failed to get last sync state, using initial commit')
    }

    return this.config.initialCommit
  }

  async getNewCommits(since: string): Promise<Commit[]> {
    try {
      // Get commits from upstream repo after the last synced commit
      const commits = await this.github.getCommits(this.upstream, since)
      return commits.data.map((commit) => ({
        hash: commit.sha,
        title: commit.commit.message,
        link: commit.html_url,
        date: commit.commit.author?.date || '',
        files: commit.files?.map((f) => f.filename) || []
      }))
    } catch (error) {
      log(
        'W',
        `Failed to get new commits: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    return []
  }

  async shouldProcessCommit(commit: Commit): Promise<boolean> {
    if (!this.config.pathStartsWith) {
      return true
    }

    return commit.files.some((file) =>
      file.startsWith(this.config.pathStartsWith!)
    )
  }

  async createIssue(commit: Commit) {
    try {
      // Check if commit has already been processed
      const existing = await this.github.searchIssue(
        this.head,
        `is:issue label:sync ${commit.hash}`
      )
      if (existing.data.total_count > 0) {
        log('I', 'Issue already exists')
        return
      }

      // Create new issue
      const title = `[Sync] ${commit.title}`
      const body = [
        `Upstream changes detected:`,
        ``,
        `Commit: ${commit.hash}`,
        `Link: ${commit.link}`,
        ``,
        `Please review these changes and update the translation accordingly.`
      ].join('\n')

      const issue = await this.github.createIssue(this.head, {
        title,
        body,
        labels: ['sync']
      })
      log('S', `Issue created: ${issue.data.html_url}`)
    } catch (error) {
      log('E', `Failed to create issue for commit: ${commit.hash}`)
      throw error
    }
  }
}
