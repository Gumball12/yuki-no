import { Octokit } from '@octokit/rest';
import type { Remote } from './config';
import type { Issue, Comment, BatchSearchResult } from './types';
import { log } from './utils';

export interface CreateIssueOptions {
  title: string;
  body: string;
  labels: string[];
}

export class GitHub {
  api: Octokit;
  private lastQuotaRemaining: number = 0;

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
      status: 'success',
    });
  }

  async getLatestRun(remote: Remote, name: string) {
    const { data } = await this.getRuns(remote);

    // Filter runs by workflow name (e.g., 'yuki-no')
    // Note: Only successful runs are included as filtered by getRuns
    const successfulRuns = data.workflow_runs.filter(run => run.name === name);

    // Return the second latest run (index 1) as the latest run (index 0)
    // is the currently executing workflow
    return successfulRuns[1];
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

      const convertedIssues = response.data.map<Issue>(item => ({
        number: item.number,
        title: item.title || '',
        body: item.body === null ? undefined : item.body,
        state: item.state as 'open' | 'closed',
        user: item.user === null ? undefined : { login: item.user.login },
        created_at: item.created_at,
        updated_at: item.updated_at,
        labels: item.labels.map(label =>
          typeof label === 'string' ? label : label.name,
        ),
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

  async setLabels(
    remote: Remote,
    issueNumber: number,
    labels: string[],
  ): Promise<void> {
    log('I', `Setting labels for issue #${issueNumber}: ${labels.join(', ')}`);

    await this.api.issues.setLabels({
      owner: remote.owner,
      repo: remote.name,
      issue_number: issueNumber,
      labels,
    });

    log('S', `Labels set for issue #${issueNumber}`);
  }

  /**
   * Batch search for issues containing commit hashes
   * Optimized to reduce API calls by searching multiple hashes at once
   */
  async batchSearchIssues(
    remote: Remote,
    hashes: string[],
  ): Promise<BatchSearchResult> {
    const MAX_QUERY_HASHES = 5;
    const results: { [hash: string]: boolean } = {};

    log(
      'I',
      `Searching for ${hashes.length} commits in batches of ${MAX_QUERY_HASHES}`,
    );

    for (let i = 0; i < hashes.length; i += MAX_QUERY_HASHES) {
      const chunk = hashes.slice(i, i + MAX_QUERY_HASHES);
      const query = chunk.map(hash => `${hash} in:body`).join(' OR ');

      const searchQuery = `repo:${remote.owner}/${remote.name} type:issue (${query})`;

      try {
        log(
          'I',
          `Searching batch ${Math.floor(i / MAX_QUERY_HASHES) + 1}/${Math.ceil(hashes.length / MAX_QUERY_HASHES)}`,
        );
        const response = await this.api.search.issuesAndPullRequests({
          q: searchQuery,
        });

        const foundHashes = response.data.items
          .map(item => {
            const hash = this.extractHashFromIssue(item);
            return hash;
          })
          .filter(Boolean);

        // Map results for each hash in the chunk
        chunk.forEach(hash => {
          results[hash] = foundHashes.includes(hash);
          log(
            'I',
            `Commit ${hash}: ${results[hash] ? 'issue exists' : 'no issue found'}`,
          );
        });

        this.lastQuotaRemaining = parseInt(
          response.headers['x-ratelimit-remaining'] || '0',
          10,
        );
        log('I', `API quota remaining: ${this.lastQuotaRemaining}`);

        // Add delay between batches if not the last batch
        if (i + MAX_QUERY_HASHES < hashes.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'status' in error &&
          error.status === 403
        ) {
          log('W', 'API rate limit exceeded, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          i -= MAX_QUERY_HASHES; // Retry current chunk
          continue;
        }
        throw error;
      }
    }

    return {
      exists: results,
      metadata: {
        totalCount: Object.values(results).filter(Boolean).length,
        incompleteResults: false,
        apiQuotaRemaining: this.lastQuotaRemaining,
      },
    };
  }

  private extractHashFromIssue(issue: any): string | null {
    const commitUrlRegex =
      /https:\/\/github\.com\/[^\/]+\/[^\/]+\/commit\/([a-f0-9]{7,40})/;
    const match = issue.body?.match(commitUrlRegex);
    return match ? match[1] : null;
  }
}
