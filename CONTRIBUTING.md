# Contributing to Yuki-no

Thank you for your interest in contributing to Yuki-no! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js v22.0.0 or higher
- [Yarn Classic](https://classic.yarnpkg.com/lang/en/) (install via [Node Corepack](https://nodejs.org/api/corepack.html))
  ```bash
  corepack enable
  ```
- GitHub account
- An upstream repository
- GitHub Personal Access Token (Fine-grained)

### Setting up GitHub Fine-grained PAT

> [!WARNING]
>
> **Important Notes**
>
> - Never share your PAT with anyone
> - Use Fine-grained PAT instead of Classic PAT for better permission control

1. [Create a new Fine-grained PAT](https://github.com/settings/personal-access-tokens/new)
2. Repository access settings:
   - Select "Only select repositories"
   - Choose your upstream repository
3. Repository Permissions:
   - Contents: Read and write
   - Issues: Read and write (needed for release tracking)
   - Metadata: Read (set automatically)

For more details, see [GitHub documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

### Local Environment Setup

> [!WARNING]
>
> **Important Notes**
>
> - The `.env` file is in .gitignore by default
> - Never commit the `.env` file to git

1. [Fork](https://github.com/Gumball12/yuki-no/fork) and clone the repository

   ```bash
   git clone https://github.com/Gumball12/yuki-no.git
   cd yuki-no

   # Install dependencies
   yarn install
   ```

2. Create `.env` file in the project root

   ```.env
   ACCESS_TOKEN=your_pat_here
   USER_NAME=your_github_username
   EMAIL=your_github_email
   HEAD_REPO=https://github.com/head_username/head_repo.git
   UPSTREAM_REPO=https://github.com/your_username/your_repo.git
   TRACK_FROM=head_commit_hash

   # ...
   ```

   > [!IMPORTANT]
   > For local development, you must set `UPSTREAM_REPO` explicitly.
   > The automatic repository detection only works in GitHub Actions.

For more environment variables, see [README](./README.md#configuration).

### Development Workflow

1. Create a new branch for your changes:

```bash
git checkout -b feat/your-feature
```

2. Run tests and the application:

```bash
yarn test # unit tests
yarn start:dev # run script
```

3. Format your code:

```bash
yarn lint
```

4. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve issue #123"
```

5. Push your changes and create a pull request!

### Troubleshooting

#### Common Issues

If you find bugs not covered here, please [open an issue](https://github.com/Gumball12/yuki-no/issues).

**GitHub API 403 Errors**:

- Check your PAT permissions

## Project Structure

```
src/
├── index.ts           # Entry point
├── createConfig.ts    # Configuration setup and validation
├── utils.ts           # Utility functions
├── git/               # Git operations
├── github/            # GitHub API interactions
├── releaseTracking/   # Release tracking functionality
└── tests/             # Unit tests
```

### Flow

The diagram below shows the execution flow of Yuki-no:

```mermaid
stateDiagram-v2
  state "syncCommits" as sc
  state "releaseTracking" as rt

  state Initialize {
    direction LR

    state "createConfig" as cf
    state "Git" as g
    state "GitHub" as gh

    cf --> g
    g --> gh
  }

  state if_rt <<choice>>

  [*] --> Initialize
  Initialize --> sc

  sc --> if_rt
  if_rt --> [*]: releaseTracking == false
  if_rt --> rt: releaseTracking == true

  rt --> [*]
```

1. **Initialize**: Sets up the configuration and initializes Git and GitHub clients
2. **syncCommits**: Synchronizes commits from the head repository to issues
3. **releaseTracking**: When enabled, updates issues with release information

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. Tests are in the `src/tests/` directory.

### Running Tests

To run tests with coverage:

```bash
yarn test
```

### About Mocking

We generally recommend avoiding excessive mocking in tests. However, for operations with side-effects that aren't directly related to what you're testing, mocking is appropriate:

- Network requests to external services (e.g. GitHub API)
- File system operations (creating/deleting files, like Git)
- Other operations with unpredictable results

External libraries without side-effects should **not** be mocked. These libraries are typically well-tested already, and as long as their version remains consistent, they won't introduce unexpected behavior.

For similar reasons, most mocked behaviors are excluded from our test coverage metrics. Currently, we only have [mockedRequests.test.ts](./src/tests/mockedRequests.test.ts) for testing GitHub API interactions while maintaining idempotence.

When mocking is necessary, follow these practices:

- Mock only the specific functions needed
- Keep mocks as close to real behavior as possible
- Reset mocks between tests using `vi.clearAllMocks()`

## Getting Help

If you need help:

1. Check existing issues and docs
2. Open a new issue with a clear description

## Publishing (Maintainers Only)

This project serves dual purposes: a GitHub Action and an npm package for TypeScript types.

### Release Types

For publishing TypeScript types to npm:

1. Update version in `package.json`
2. Commit and push changes
3. Create GitHub Release with tag `npm-v1.x.x` (e.g., `npm-v1.0.0`)
4. GitHub Actions automatically builds types and publishes to npm
5. Plugin developers can install: `npm install yuki-no`

### Manual Publishing

If automatic publishing fails, you can manually publish:

```bash
npm publish
```

**Prerequisites:**

- `NPM_TOKEN` secret configured in GitHub repository settings
- npm publishing permissions for the `yuki-no` package

## License

By contributing, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) for details.
