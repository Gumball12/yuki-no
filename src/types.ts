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
  labels?: (string | { name: string })[];
}
