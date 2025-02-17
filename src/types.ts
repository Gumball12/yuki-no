export interface ReleaseInfo {
  preRelease?: ReleaseTag;
  release?: ReleaseTag;
}

export interface ReleaseTag {
  tag: string;
  url: string;
}

export interface Comment {
  id: number;
  body?: string;
  user?: {
    login: string;
  };
  created_at: string;
}

export interface Issue {
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  user?: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  labels: (string | undefined)[];
}

export interface BatchSearchResult {
  exists: { [hash: string]: boolean };
  metadata: {
    totalCount: number;
    incompleteResults: boolean;
    apiQuotaRemaining: number;
  };
}

export interface BatchConfig {
  /** Number of commits to process in a single batch */
  size: number;
  /** Delay between batches in milliseconds */
  delayMs: number;
  /** Maximum retries for API rate limit errors */
  maxRetries: number;
}
