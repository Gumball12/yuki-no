import { log, extractBasename, removeHash, getUrlWithoutDotGit } from './utils';
import type { Config, Remote } from './config';
import type { Issue, Comment, ReleaseInfo, BatchConfig } from './types';
import { GitHub } from './github';
import { Repository } from './repository';
import picomatch from 'picomatch';

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
  github: GitHub;
  repo: Repository;

  private readonly batchConfig: BatchConfig = {
    size: 5,
    delayMs: 3000,
    maxRetries: 3,
  };

  constructor(config: Config) {
    this.config = config;
    this.upstream = config.remote.upstream;
    this.head = config.remote.head;

    this.github = new GitHub(config.accessToken);

    this.repo = new Repository({
      path: 'repo',
      token: config.accessToken,
      userName: config.userName,
      email: config.email,
      head: this.head,
    });
  }

  async start(): Promise<void> {
    log('I', 'Starting Yuki-no with batch processing...');
    this.repo.setup();

    const feed = await this.getFeed();
    const lastSuccessfulRunAt = await this.getRun();

    // rearrange processing order
    // https://github.com/vuejs-translations/ryu-cho/pull/18
    feed.sort((a, b) => (a.isoDate > b.isoDate ? 1 : -1));

    log('I', `Found ${feed.length} commits to process`);
    log('I', '=== Processing Commits ===');

    let totalProcessed = 0;
    let totalBatchTime = 0;
    let totalCreatedIssues = 0;

    for (let i = 0; i < feed.length; i += this.batchConfig.size) {
      const batch = feed.slice(i, i + this.batchConfig.size);
      const batchNumber = Math.floor(i / this.batchConfig.size) + 1;
      const totalBatches = Math.ceil(feed.length / this.batchConfig.size);

      log('I', `Processing batch ${batchNumber}/${totalBatches}`);

      // Filter valid feeds (containing tracked files)
      const validFeeds = await Promise.all(
        batch.map(async feed => {
          if (lastSuccessfulRunAt && lastSuccessfulRunAt > feed.isoDate) {
            log(
              'I',
              `Skipping commit "${feed.contentSnippet}" (older than last successful run)`,
            );
            return null;
          }
          const hash = extractBasename(feed.link);
          return (await this.containsValidFile(hash)) ? feed : null;
        }),
      );

      const filteredBatch = validFeeds.filter(
        (feed): feed is Feed => feed !== null,
      );

      if (filteredBatch.length > 0) {
        const { batchTime, processedCount, createdIssues } =
          await this.processFeedBatch(filteredBatch);
        totalProcessed += processedCount;
        totalBatchTime += batchTime;
        totalCreatedIssues += createdIssues;

        // Calculate and log progress
        const progress = (totalProcessed / feed.length) * 100;
        const avgBatchTime = totalBatchTime / batchNumber;
        const remainingBatches = totalBatches - batchNumber;
        const estimatedTimeRemaining = avgBatchTime * remainingBatches;

        log('I', `Progress: ${Math.round(progress)}%`);
        log(
          'I',
          `Estimated time remaining: ${Math.ceil(estimatedTimeRemaining / 1000)}s`,
        );
      }

      // Add delay between batches
      if (i + this.batchConfig.size < feed.length) {
        await new Promise(resolve =>
          setTimeout(resolve, this.batchConfig.delayMs),
        );
      }
    }

    log(
      'S',
      `Processing completed: ${totalCreatedIssues} issues created from ${totalProcessed} commits`,
    );

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

  async getFeed(): Promise<Feed[]> {
    log('I', 'Fetching commits from head repo...');

    // Fetch latest commits
    const fetchResult = this.repo.git.fetch(this.head.name, this.head.branch);

    // Check if fetchResult is undefined or has error code
    if (
      !fetchResult ||
      (typeof fetchResult === 'object' &&
        'code' in fetchResult &&
        fetchResult.code !== 0)
    ) {
      // For testing purposes, we'll continue even if fetch fails
      log('W', 'Failed to fetch commits, continuing with existing data');
    }

    // Get commit history using git log, starting from trackFrom if specified
    const gitLogCommand = this.config.trackFrom
      ? `log ${this.head.name}/${this.head.branch} ${this.config.trackFrom}.. --format=format:"%H|%s|%aI" --no-merges`
      : `log ${this.head.name}/${this.head.branch} --format=format:"%H|%s|%aI" --no-merges`;

    log('I', `Executing git command: ${gitLogCommand}`);
    const result = this.repo.git.exec(gitLogCommand);

    if (!result || !result.stdout || typeof result.stdout !== 'string') {
      return [];
    }

    // Parse each line into feed format
    return result.stdout
      .split('\n')
      .filter(Boolean)
      .map((line: string) => {
        const [hash, subject, date] = line.split('|');
        if (!hash || !subject || !date) {
          return null;
        }

        try {
          const commitUrl = `${getUrlWithoutDotGit(this.head.url)}/commit/${hash}`;

          return {
            link: commitUrl,
            title: subject,
            contentSnippet: subject,
            isoDate: new Date(date).toISOString(),
          };
        } catch (error) {
          log('W', `Failed to parse commit: ${line}`);
          return null;
        }
      })
      .filter((item: Feed | null): item is Feed => item !== null);
  }

  async processFeedBatch(feeds: Feed[]) {
    const startTime = Date.now();
    const hashes: string[] = [];
    const feedMap = new Map<string, Feed>();

    // Extract hashes and create feed mapping
    for (const feed of feeds) {
      const hash = extractBasename(feed.link);
      hashes.push(hash);
      feedMap.set(hash, feed);
    }

    log('I', `Processing batch of ${feeds.length} commits`);

    try {
      const results = await this.github.batchSearchIssues(
        this.upstream,
        hashes,
      );

      // Create issues for commits without existing issues
      const createIssuePromises: Promise<number | null>[] = [];

      for (const [hash, exists] of Object.entries(results.exists)) {
        if (!exists) {
          const feed = feedMap.get(hash);
          if (feed) {
            log('I', `Creating issue for commit "${feed.contentSnippet}"`);
            createIssuePromises.push(this.createIssue(feed));
          }
        } else {
          log(
            'I',
            `Skipping commit "${feedMap.get(hash)?.contentSnippet}" (issue exists)`,
          );
        }
      }

      if (createIssuePromises.length > 0) {
        await Promise.all(createIssuePromises);
      }

      const batchTime = Date.now() - startTime;
      log('I', `Batch processed in ${batchTime}ms`);

      return {
        batchTime,
        processedCount: feeds.length,
        createdIssues: createIssuePromises.length,
      };
    } catch (error) {
      log(
        'E',
        `Error processing batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async containsValidFile(hash: string): Promise<boolean> {
    // If no patterns specified, include all files
    if (this.config.include.length === 0 && this.config.exclude.length === 0) {
      return true;
    }

    log('I', 'Checking for file changes...');
    const res = await this.github.getCommit(this.head, hash);

    // Create matchers
    const isMatch = picomatch(
      this.config.include.length ? this.config.include : ['**'],
    );
    const isExcluded = picomatch(this.config.exclude);

    return res.data.files!.some(file => {
      const filename = file.filename!;

      // Check exclude patterns first (they take precedence)
      if (isExcluded(filename)) {
        log('I', `Excluded file: ${filename}`);
        return false;
      }

      // Check include patterns
      const matches = isMatch(filename);
      if (matches) {
        log('I', `Found relevant file change: ${filename}`);
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
    // Match GitHub commit URL pattern regardless of the surrounding text
    // Supports both full (40 chars) and short (7 chars) commit hashes
    const urlMatch = body.match(
      /https:\/\/github\.com\/[^\/]+\/[^\/]+\/commit\/([a-f0-9]+)/i,
    );
    if (!urlMatch) {
      return;
    }

    const hash = urlMatch[1];
    // Validate git commit hash format
    // Only accept 40 chars (full) or 7 chars (short) hashes
    if (hash.length !== 40 && hash.length !== 7) {
      return;
    }

    // Additional validation for hexadecimal format
    if (!/^[a-f0-9]+$/i.test(hash)) {
      return;
    }

    return hash;
  }

  public formatReleaseComment(info: ReleaseInfo): string {
    return [
      `- pre-release: ${info.preRelease ? `[${info.preRelease.tag}](${info.preRelease.url})` : 'none'}`,
      `- release: ${info.release ? `[${info.release.tag}](${info.release.url})` : 'none'}`,
    ].join('\n');
  }
}
