import { Octokit } from '@octokit/rest';
import type { Remote } from './config';
import type { Issue, Comment } from './types';

export interface CreateIssueOptions {
  title: string;
  body: string;
  labels: string[];
}

export class GitHub {
  api: Octokit;

  constructor(auth: string) {
    this.api = new Octokit({ auth });
  }

  searchIssue(remote: Remote, hash: string) {
    return this.api.search.issuesAndPullRequests({
      q: `${hash} repo:${remote.owner}/${remote.name} type:issue`,
    });
  }

  getCommit(remote: Remote, hash: string) {
    return this.api.repos.getCommit({
      owner: remote.owner,
      repo: remote.name,
      ref: hash,
    });
  }

  createIssue(remote: Remote, options: CreateIssueOptions) {
    return this.api.issues.create({
      owner: remote.owner,
      repo: remote.name,
      title: options.title,
      body: options.body,
      labels: options.labels,
    });
  }

  getRuns(remote: Remote) {
    return this.api.actions.listWorkflowRunsForRepo({
      owner: remote.owner,
      repo: remote.name,
    });
  }

  async getLatestRun(remote: Remote, name: string) {
    const { data } = await this.getRuns(remote);

    // Strip out all runs which are not relevant. We only want to keep a list
    // of runs that has the name of `config.workflowName`.
    const runs = data.workflow_runs.filter(run => {
      return run.name === name;
    });

    // Return the second latest run from the list because the latest run is the
    // run that is executing right now. What we want is the "previous" run,
    // which is the second latest.
    return runs[1] ?? null;
  }

  async getOpenIssues(remote: Remote): Promise<Issue[]> {
    const issues: Issue[] = [];
    let page = 1;

    while (true) {
      const response = await this.api.issues.listForRepo({
        owner: remote.owner,
        repo: remote.name,
        state: 'open',
        per_page: 100,
        page,
      });

      if (response.data.length === 0) {
        break;
      }

      const convertedIssues = response.data.map(item => ({
        number: item.number,
        title: item.title || '',
        body: item.body === null ? undefined : item.body,
        state: item.state as 'open' | 'closed',
        user: item.user === null ? undefined : { login: item.user.login },
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      issues.push(...convertedIssues);
      page++;
    }

    return issues;
  }

  async getIssueComments(
    remote: Remote,
    issueNumber: number,
  ): Promise<Comment[]> {
    const response = await this.api.issues.listComments({
      owner: remote.owner,
      repo: remote.name,
      issue_number: issueNumber,
    });

    return response.data.map(item => ({
      id: item.id,
      body: item.body,
      user: item.user === null ? undefined : { login: item.user.login },
      created_at: item.created_at,
    }));
  }

  async createComment(
    remote: Remote,
    issueNumber: number,
    body: string,
  ): Promise<void> {
    await this.api.issues.createComment({
      owner: remote.owner,
      repo: remote.name,
      issue_number: issueNumber,
      body,
    });
  }
}
