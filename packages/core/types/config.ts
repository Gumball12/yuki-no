export type Config = Readonly<{
  accessToken: string;
  userName: string;
  email: string;
  upstreamRepoSpec: RepoSpec;
  headRepoSpec: RepoSpec;
  trackFrom: string;
  include: string[];
  exclude: string[];
  labels: string[];
  releaseTracking: boolean;
  plugins: string[];
  verbose: boolean;
}>;

export type RepoSpec = {
  owner: string;
  name: string;
  branch: string;
};
