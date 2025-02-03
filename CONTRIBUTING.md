# Contributing to Yuki-no

Thank you for your interest in contributing to Yuki-no! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js v22.0.0 or higher
- [Yarn Classic](https://classic.yarnpkg.com/lang/en/) (available through [Node Corepack](https://nodejs.org/api/corepack.html))
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
   - Issues: Read and write (required for release tracking)
   - Metadata: Read (automatically set)

For more PAT details, see [GitHub documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

### Local Environment Setup

> [!WARNING]
>
> **Important Notes**
>
> - The `.env` file is included in .gitignore by default
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

For detailed environment variable settings, see [action.yml](./action.yml).

#### How It Works

1. Detects new commits in `HEAD_REPO` repository
   - Commits after `TRACK_FROM`
   - Changes in `PATH_STARTS_WITH` directory (if not set, entire project)
2. Creates issues for detected commits
3. Adds release information as issue comments when `release-tracking` is enabled

### Development Workflow

1. Create a new branch for your changes:

```bash
git checkout -b feat/your-feature
```

2. Running and ensure tests pass:

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

1. **GitHub Actions Bot vs PAT Authentication**

   - While GitHub Actions automatically creates issues as 'github-actions' bot, using PAT will create issues as the PAT owner
   - When using PAT, make sure to set `USER_NAME` and `EMAIL` in `.env` to match the PAT owner's account
   - Release tracking will not work if the issue creator doesn't match the configured `USER_NAME`

1. **GitHub API 403 Errors**

   - Check PAT permissions

If you encounter any bugs not covered in this troubleshooting guide, please [open an issue](https://github.com/Gumball12/yuki-no/issues).

## Project Structure

```
src/
├── config.ts     # Configuration types and validation
├── defaults.ts   # Default configuration values
├── github.ts     # GitHub API interactions
├── git.ts       # Git operations
├── index.ts     # Entry point
├── repository.ts # Repository operations
├── rss.ts       # RSS feed handling
├── types.ts     # Common type definitions
├── utils.ts     # Utility functions
└── yuki-no.ts   # Main application logic

tests/           # Unit tests
```

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. Tests are located in the `tests/` directory.

### Running Tests

To run tests with coverage:

```bash
yarn test
```

### Writing Tests

1. **Test Structure**

```typescript
describe('YukiNo', () => {
  describe('feature', () => {
    it('should handle specific case', () => {
      // Arrange
      const yukiNo = new YukiNo(mockConfig);

      // Act
      const result = yukiNo.someMethod();

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

2. **Mocking**

```typescript
vi.mock('../src/github', () => ({
  GitHub: vi.fn(() => ({
    getOpenIssues: vi.fn(),
    createComment: vi.fn(),
  })),
}));
```

## Main Features and Their Tests

1. **Commit Processing**

   - Tracking new commits
   - Creating issues and PRs
   - Handling merge conflicts
   - Path filtering

2. **Release Tracking**

   - Pre-release detection
   - Release status updates
   - Comment formatting
   - Skip conditions

3. **Configuration**
   - Environment variables
   - Default values
   - Validation

## Getting Help

If you need help or have questions:

1. Check existing issues and documentation
2. Open a new issue with a clear description
3. Use appropriate labels

## License

By contributing, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) for details.
