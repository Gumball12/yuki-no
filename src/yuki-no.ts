import { log, extractBasename, removeHash } from './utils';
import type { Config, Remote } from './config';
import type { Issue, Comment, ReleaseInfo } from './types';
import { Rss } from './rss';
import { GitHub } from './github';
import { Repository } from './repository';

interface Feed {
  link: string;
  title: string;
  contentSnippet: string;
  isoDate: string;
}

export class YukiNo {
  config: Config;
  upstream: Remote;
  head: Remote;
  rss: Rss;
  github: GitHub;
  repo: Repository;

  constructor(config: Config) {
    this.config = config;
    this.upstream = config.remote.upstream;
    this.head = config.remote.head;

    this.rss = new Rss();

    this.github = new GitHub(config.accessToken);

    this.repo = new Repository({
      path: 'repo',
      token: config.accessToken,
      userName: config.userName,
      email: config.email,
      upstream: this.upstream,
      head: this.head,
    });
  }

  async start(): Promise<void> {
    log('I', 'Starting Yuki-no...');
    this.repo.setup();

    const feed = await this.getFeed();
    feed.sort((a, b) => (a.isoDate > b.isoDate ? 1 : -1));

    const lastSuccessfulRunAt = await this.getRun();

    log('I', `Found ${feed.length} commits to process`);
    log('I', '=== Processing Commits ===');

    for (const i in feed) {
      await this.processFeed(feed[i], lastSuccessfulRunAt);
    }

    if (this.config.releaseTracking) {
      log('I', '=== Processing Release Tracking ===');
      await this.trackReleases();
    }

    log('S', 'Yuki-no completed successfully');
  }

  async getRun() {
    log('I', 'Getting latest run information...');
    const run = await this.github.getLatestRun(this.upstream, 'yuki-no');
    return run ? new Date(run.created_at).toISOString() : '';
  }

  async getFeed() {
    log('I', 'Fetching commits from head repo...');
    return this.rss.get(this.head, this.config.trackFrom) as Promise<Feed[]>;
  }

  async processFeed(feed: Feed, lastSuccessfulRunAt: string) {
    if (lastSuccessfulRunAt > feed.isoDate) {
      log(
        'I',
        `Skipping commit "${feed.contentSnippet}" (older than last successful run)`,
      );
      return;
    }

    const hash = extractBasename(feed.link);

    // Check if the commit contains file path that we want to track.
    // If not, do nothing and abort.
    if (!(await this.containsValidFile(hash))) {
      log(
        'I',
        `Skipping commit "${feed.contentSnippet}" (no relevant file changes)`,
      );
      return;
    }

    log('I', `Processing commit "${feed.contentSnippet}"`);

    const issueNo = await this.createIssueIfNot(feed, hash);

    if (issueNo === null) {
      log('W', `Issue already exists for commit "${feed.contentSnippet}"`);
    } else {
      log('S', `Created issue #${issueNo} for commit "${feed.contentSnippet}"`);
    }
  }

  async containsValidFile(hash: string) {
    if (!this.config.pathStartsWith) {
      return true;
    }

    log(
      'I',
      `Checking for file changes in path "${this.config.pathStartsWith}"`,
    );
    const res = await this.github.getCommit(this.head, hash);

    return res.data.files!.some(file => {
      const matches = file.filename!.startsWith(this.config.pathStartsWith!);
      if (matches) {
        log('I', `Found relevant file change: ${file.filename}`);
      }
      return matches;
    });
  }

  async createIssueIfNot(feed: Feed, hash: string) {
    const res = await this.github.searchIssue(this.upstream, hash);

    return res.data.total_count > 0 ? null : this.createIssue(feed);
  }

  async createIssue(feed: Feed) {
    const title = removeHash(feed.title);
    const body = `New updates on head repo.\r\n${feed.link}`;

    const res = await this.github.createIssue(this.upstream, {
      title,
      body,
      labels: this.config.labels,
    });

    log('S', `Issue created: ${res.data.html_url}`);

    return res.data.number;
  }

  async trackReleases(): Promise<void> {
    if (!this.config.releaseTracking) {
      return;
    }

    const issues = await this.github.getOpenIssues(this.upstream);
    log('I', `Found ${issues.length} open issues to check for releases`);

    for (const issue of issues) {
      await this.processIssueRelease(issue);
    }
  }

  async processIssueRelease(issue: Issue): Promise<void> {
    if (!this.isYukiNoIssue(issue)) {
      log('I', `Skipping issue #${issue.number} (not a Yuki-no issue)`);
      return;
    }

    log('I', `Processing release status for issue #${issue.number}`);

    const commitHash = this.extractCommitHash(issue.body ?? '');
    if (!commitHash) {
      log('W', `Could not extract commit hash from issue #${issue.number}`);
      return;
    }

    const releaseInfo = this.repo.getReleaseInfo(commitHash);
    log('I', '--- Managing Release Labels ---');
    await this.#manageReleaseLabels(issue, releaseInfo);
    log('I', '--- Managing Release Comments ---');
    await this.#updateReleaseComment(issue, releaseInfo);
  }

  async #manageReleaseLabels(
    issue: Issue,
    releaseInfo: ReleaseInfo,
  ): Promise<void> {
    const releaseTrackingLabels = this.config.releaseTrackingLabels;
    const currentLabels = issue.labels.filter(
      (label): label is string => label !== undefined,
    );
    const hasFullRelease = releaseInfo.release !== undefined;

    // Calculate new labels
    const newLabels = hasFullRelease
      ? currentLabels.filter(label => !releaseTrackingLabels.includes(label))
      : Array.from(new Set([...currentLabels, ...releaseTrackingLabels]));

    // Only update if labels have changed
    if (
      JSON.stringify(currentLabels.sort()) !== JSON.stringify(newLabels.sort())
    ) {
      log('I', `Updating labels for issue #${issue.number}`);
      await this.github.setLabels(this.upstream, issue.number, newLabels);
    } else {
      log('I', `No labels change for issue #${issue.number}`);
    }
  }

  async #updateReleaseComment(
    issue: Issue,
    releaseInfo: ReleaseInfo,
  ): Promise<void> {
    const comments = await this.github.getIssueComments(
      this.upstream,
      issue.number,
    );
    const lastReleaseComment = this.findLastReleaseComment(comments);

    if (lastReleaseComment && this.hasFullRelease(lastReleaseComment)) {
      log('I', `Issue #${issue.number} already has full release status`);
      return;
    }

    const newComment = this.formatReleaseComment(releaseInfo);
    if (lastReleaseComment?.body === newComment) {
      log('I', `No release status changes for issue #${issue.number}`);
      return;
    }

    log('I', `Updating release status for issue #${issue.number}`);
    await this.github.createComment(this.upstream, issue.number, newComment);
    log('S', `Updated release status for issue #${issue.number}`);
  }

  isYukiNoIssue(issue: Issue): boolean {
    return this.config.labels.every(label =>
      issue.labels.some(issueLabel => issueLabel === label),
    );
  }

  findLastReleaseComment(comments: Comment[]): Comment | undefined {
    return [...comments]
      .reverse()
      .find(comment => this.isReleaseTrackingComment(comment));
  }

  isReleaseTrackingComment(comment: Comment): boolean {
    const content = comment.body ?? '';
    return (
      content.startsWith('- pre-release:') &&
      content.includes('\n- release:') &&
      content.split('\n').length === 2
    );
  }

  hasFullRelease(comment: Comment): boolean {
    return (comment.body ?? '').includes('- release: [v');
  }

  extractCommitHash(body: string): string | undefined {
    const match = body.match(/[\r|\n|\r\n](.+)$/);
    return match ? extractBasename(match[1]) : undefined;
  }

  public formatReleaseComment(info: ReleaseInfo): string {
    return [
      `- pre-release: ${info.preRelease ? `[${info.preRelease.tag}](${info.preRelease.url})` : 'none'}`,
      `- release: ${info.release ? `[${info.release.tag}](${info.release.url})` : 'none'}`,
    ].join('\n');
  }
}
