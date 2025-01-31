import { Octokit } from '@octokit/rest'
import { type Remote } from './config'
import { log } from './utils'

export interface CreateIssueOptions {
  title: string
  body: string
  labels?: string[]
}

export interface UpdateIssueOptions {
  body: string
}

export class GitHub {
  api: Octokit

  constructor(auth: string) {
    this.api = new Octokit({ auth })
  }

  searchIssue(remote: Remote, query: string) {
    return this.api.search.issuesAndPullRequests({
      q: `${query} repo:${remote.owner}/${remote.name} type:issue`
    })
  }

  getCommit(remote: Remote, hash: string) {
    return this.api.repos.getCommit({
      owner: remote.owner,
      repo: remote.name,
      ref: hash
    })
  }

  async getCommitDate(remote: Remote, hash: string): Promise<string> {
    try {
      const { data } = await this.getCommit(remote, hash)
      return data.commit.author?.date || data.commit.committer?.date || ''
    } catch (error) {
      log('E', `Failed to get commit date for ${hash}`)
      throw error
    }
  }

  async getCommits(remote: Remote, since: string) {
    // If since is a commit hash, get its date first
    if (/^[a-f0-9]{40}$/.test(since)) {
      since = await this.getCommitDate(remote, since)
    }

    return this.api.repos.listCommits({
      owner: remote.owner,
      repo: remote.name,
      since
    })
  }

  createIssue(remote: Remote, options: CreateIssueOptions) {
    return this.api.issues.create({
      owner: remote.owner,
      repo: remote.name,
      title: options.title,
      body: options.body,
      labels: options.labels
    })
  }

  updateIssue(
    remote: Remote,
    issueNumber: number,
    options: UpdateIssueOptions
  ) {
    return this.api.issues.update({
      owner: remote.owner,
      repo: remote.name,
      issue_number: issueNumber,
      body: options.body
    })
  }

  getRuns(remote: Remote) {
    return this.api.actions.listWorkflowRunsForRepo({
      owner: remote.owner,
      repo: remote.name
    })
  }

  async getLatestRun(remote: Remote, name: string) {
    const { data } = await this.getRuns(remote)

    // Strip out all runs which are not relevant. We only want to keep a list
    // of runs that has the name of `config.workflowName`.
    const runs = data.workflow_runs.filter((run) => {
      return run.name === name
    })

    // Return the second latest run from the list because the latest run is the
    // run that is executing right now. What we want is the "previous" run,
    // which is the second latest.
    return runs[1] ?? null
  }
}
