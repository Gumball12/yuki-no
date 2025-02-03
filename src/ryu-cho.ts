import { log, extractBasename, removeHash, splitByNewline } from './utils';
import type { Config, Remote } from './config';
import type { Issue, Comment, ReleaseInfo } from './types';
import { Rss } from './rss';
import { GitHub } from './github';
import { Repository } from './repository';
import { defaults } from './defaults';

interface Feed {
  link: string;
  title: string;
  contentSnippet: string;
  isoDate: string;
}

export class RyuCho {
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
    this.repo.setup();

    const run = await this.getRun();
    const feed = await this.getFeed();

    for (const i in feed) {
      await this.processFeed(feed[i] as Feed, run);
    }

    if (this.config.releaseTracking) {
      await this.trackReleases();
    }
  }

  protected async getRun() {
    const run = await this.github.getLatestRun(this.upstream, 'ryu-cho');
    return run ? new Date(run.created_at).toISOString() : '';
  }

  protected async getFeed() {
    return this.rss.get(this.head, this.config.trackFrom);
  }

  protected async processFeed(feed: Feed, run: string) {
    // Skip any feed which is older than the last run.
    if (run > feed.isoDate) {
      return;
    }

    const hash = extractBasename(feed.link);

    // Check if the commit contains file path that we want to track.
    // If not, do nothing and abort.
    if (!(await this.containsValidFile(feed, hash))) {
      return;
    }

    log('I', `New commit on head repo: "${feed.contentSnippet}"`);

    // branch names consisting of 40 hex characters are not allowed
    const shortHash = hash.substr(0, 8);

    // If the branch already exists on the upstream repo, then this feed is
    // already handled. Let's stop here.
    if (this.repo.branchExists(shortHash)) {
      log('W', 'Branch already exists');
      return;
    }

    const issueNo = await this.createIssueIfNot(feed, hash);

    if (issueNo === null) {
      log('W', 'Issue already exists');
    }

    await this.createPullRequest(hash, shortHash, feed, issueNo);
  }

  protected async containsValidFile(feed: Feed, hash: string) {
    if (!this.config.pathStartsWith) {
      return true;
    }

    const res = await this.github.getCommit(this.head, hash);

    return res.data.files!.some(file => {
      return file.filename!.startsWith(this.config.pathStartsWith!);
    });
  }

  protected async createIssueIfNot(feed: Feed, hash: string) {
    const res = await this.github.searchIssue(this.upstream, hash);

    return res.data.total_count > 0 ? null : this.createIssue(feed);
  }

  protected async createIssue(feed: Feed) {
    const title = removeHash(feed.title);
    const body = `New updates on head repo.\r\n${feed.link}`;
    const labels =
      this.config.labels !== undefined
        ? splitByNewline(this.config.labels)
        : [defaults.label];

    const res = await this.github.createIssue(this.upstream, {
      title,
      body,
      labels,
    });

    log('S', `Issue created: ${res.data.html_url}`);

    return res.data.number;
  }

  protected async createPullRequest(
    hash: string,
    shortHash: string,
    feed: Feed,
    issueNo: number | null,
  ) {
    this.repo.fetchHead();
    this.repo.checkoutDefaultBranch();
    this.repo.createBranch(shortHash);

    if (this.repo.hasConflicts(hash)) {
      log('W', 'Conflicts occurred. Please make a pull request by yourself.');
      this.repo.reset();
      return;
    }

    log('S', `Successfully Fully merged`);

    this.repo.updateRemote(shortHash);

    const ref = issueNo ? `(#${issueNo})` : '';
    const title = `${removeHash(feed.contentSnippet)} ${ref}`;
    const body = `resolves #${issueNo}\r\nCherry picked from ${feed.link}`;
    const branch = shortHash;

    const res = await this.github.createPullRequest(this.upstream, {
      title,
      body,
      branch,
    });

    if (!res.data) {
      return;
    }

    log('S', `Created new pull request: ${res.data.html_url}`);
  }

  protected async trackReleases(): Promise<void> {
    const issues = await this.github.getOpenIssues(this.upstream);

    for (const issue of issues) {
      await this.processIssueRelease(issue);
    }
  }

  protected async processIssueRelease(issue: Issue): Promise<void> {
    if (!this.isRyuChoIssue(issue)) {
      return;
    }

    const comments = await this.github.getIssueComments(
      this.upstream,
      issue.number,
    );
    const lastReleaseComment = this.findLastReleaseComment(comments);

    if (lastReleaseComment && this.hasFullRelease(lastReleaseComment)) {
      return;
    }

    const commitHash = this.extractCommitHash(issue.body ?? '');
    if (!commitHash) {
      return;
    }

    const releaseInfo = this.repo.getReleaseInfo(commitHash);

    await this.github.createComment(
      this.upstream,
      issue.number,
      this.formatReleaseComment(releaseInfo),
    );
  }

  protected isRyuChoIssue(issue: Issue): boolean {
    return (
      issue.user?.login === this.config.userName &&
      (issue.body ?? '').includes('New updates on head repo')
    );
  }

  protected findLastReleaseComment(comments: Comment[]): Comment | undefined {
    for (const comment of [...comments].reverse()) {
      if (this.isReleaseTrackingComment(comment)) {
        return comment;
      }
    }
    return undefined;
  }

  protected isReleaseTrackingComment(comment: Comment): boolean {
    const content = comment.body ?? '';
    return (
      content.startsWith('- pre-release:') &&
      content.includes('\n- release:') &&
      content.split('\n').length === 2
    );
  }

  protected hasFullRelease(comment: Comment): boolean {
    return (comment.body ?? '').includes('- release: [v');
  }

  protected extractCommitHash(body: string): string | undefined {
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
