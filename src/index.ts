import { assert } from './utils'
import { createConfig } from './config'
import { YukiNo } from './yuki-no'

// Required environment variables
assert(!!process.env.ACCESS_TOKEN, '`accessToken` is required.')
assert(!!process.env.USER_NAME, '`userName` is required.')
assert(!!process.env.EMAIL, '`email` is required.')
assert(!!process.env.UPSTREAM_REPO, '`upstreamRepo` is required.')
assert(!!process.env.HEAD_REPO, '`headRepo` is required.')
assert(!!process.env.INITIAL_COMMIT, '`initialCommit` is required.')

// Create configuration
const config = createConfig({
  accessToken: process.env.ACCESS_TOKEN!,
  userName: process.env.USER_NAME!,
  email: process.env.EMAIL!,
  upstreamRepo: process.env.UPSTREAM_REPO!,
  upstreamRepoBranch: process.env.UPSTREAM_REPO_BRANCH,
  headRepo: process.env.HEAD_REPO!,
  pathStartsWith: process.env.PATH_STARTS_WITH,
  initialCommit: process.env.INITIAL_COMMIT!
})

// Setup error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  process.exit(1)
})

// Start the sync process
const yukiNo = new YukiNo(config)
yukiNo.start().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})
