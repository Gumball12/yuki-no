import { assert } from './utils';
import { createConfig } from './config';
import { YukiNo } from './yuki-no';

assert(!!process.env.ACCESS_TOKEN, '`accessToken` is required.');
assert(!!process.env.HEAD_REPO, '`headRepo` is required.');
assert(!!process.env.TRACK_FROM, '`trackFrom` is required.');

const config = createConfig({
  accessToken: process.env.ACCESS_TOKEN!,
  userName: process.env.USER_NAME,
  email: process.env.EMAIL,
  upstreamRepo: process.env.UPSTREAM_REPO,
  headRepo: process.env.HEAD_REPO!,
  headRepoBranch: process.env.HEAD_REPO_BRANCH,
  trackFrom: process.env.TRACK_FROM!,
  include: process.env.INCLUDE,
  exclude: process.env.EXCLUDE,
  labels: process.env.LABELS,
  releaseTracking: process.env.RELEASE_TRACKING,
  releaseTrackingLabels: process.env.RELEASE_TRACKING_LABELS,
  verbose: process.env.VERBOSE,
});

const yukiNo = new YukiNo(config);

yukiNo.start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

// Setup error handling
process.on('unhandledRejection', err => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
