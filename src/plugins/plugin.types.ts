import { type Config } from '../createConfig';
import { type Git } from '../git/core';
import { type GitHub } from '../github/core';
import { type Issue } from '../github/getOpenedIssues';

export interface PluginOptions {
  [key: string]: any;
}

export interface Plugin {
  name: string;
  initialize?: (config: Config, options?: PluginOptions) => Promise<void>;
  preSync?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<void>;
  onSync?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<Issue[]>;
  postSync?: (config: Config, git: Git, github: GitHub, createdIssues: Issue[], options?: PluginOptions) => Promise<void>;
  preReleaseTracking?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<void>;
  onReleaseTracking?: (config: Config, git: Git, github: GitHub, allIssues: Issue[], options?: PluginOptions) => Promise<void>;
  postReleaseTracking?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<void>;
  onEnd?: (config: Config, options?: PluginOptions) => Promise<void>;
}
