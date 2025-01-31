# Contributing to Yuki-no

Thank you for your interest in contributing to Yuki-no! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- **Node.js**: Version 22.0.0 or higher is required. You can install it from [nodejs.org](https://nodejs.org/).
- **yarn**: This project uses [yarn classic](https://classic.yarnpkg.com/lang/en/) as its package manager. It's automatically available through [Node.js corepack](https://github.com/nodejs/corepack):
  ```bash
  corepack enable
  ```

### Getting Started

1. Fork and clone the repository:

```bash
git clone https://github.com/your-username/yuki-no.git
cd yuki-no
```

2. Install dependencies:

```bash
yarn install
```

## Development Workflow

1. Create a new branch for your changes:

```bash
git checkout -b feature/your-feature
```

2. Make your changes and ensure tests pass:

```bash
yarn test
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

5. Push your changes and create a pull request.

## Testing

### Unit Tests

The project uses Vitest for testing. Tests are located in the `tests/` directory:

```
tests/
├── config.spec.ts   # Configuration tests
├── github.spec.ts   # GitHub API tests
└── yuki-no.spec.ts  # Main logic tests
```

To run unit tests with coverage report:

```bash
yarn test
```

### Writing Tests

Please refer to the existing test files in the `tests/` directory for examples and patterns to follow.

1. **Test Structure**

```typescript
describe('YukiNo', () => {
  describe('syncChanges', () => {
    it('should process new commits', async () => {
      // Arrange
      const yukiNo = new YukiNo(mockConfig)

      // Act
      await yukiNo.syncChanges()

      // Assert
      expect(...)
    })
  })
})
```

2. **Mocking**

```typescript
// Mock GitHub API responses
vi.mock('../src/github', () => ({
  GitHub: vi.fn().mockImplementation(() => ({
    getCommits: vi.fn().mockResolvedValue({
      data: [
        {
          sha: 'abc123',
          commit: { message: 'test commit' },
          html_url: 'https://github.com/test/repo/commit/abc123'
        }
      ]
    })
  }))
}))
```

## Project Structure

```
src/
├── config.ts   # Configuration types and parsing
├── github.ts   # GitHub API interactions
├── index.ts    # Entry point
├── utils.ts    # Utility functions
└── yuki-no.ts  # Main logic

tests/ # Unit tests

.github/
└── workflows/ # GitHub Actions workflows
```

## Getting Help

Open an issue for bugs or feature requests

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
