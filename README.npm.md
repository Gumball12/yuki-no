# Yuki-no Plugin Types

TypeScript types for developing [Yuki-no](https://github.com/Gumball12/yuki-no) plugins.

## Quick Start

```bash
npm install @gumball12/yuki-no # You can use Yarn, PNPM, ...
```

```ts
import type { YukiNoPlugin } from 'yuki-no';

const myPlugin: YukiNoPlugin = {
  name: 'my-plugin',
  async onInit(ctx) {
    console.log('Plugin initialized!');
  },
  async onAfterCreateIssue(ctx) {
    console.log(`Created issue: ${ctx.result.html_url}`);
  },
};

export default myPlugin;
```

## Documentation

📖 **[Complete Plugin Development Guide](https://github.com/Gumball12/yuki-no/blob/main/PLUGINS.md)**

For detailed documentation, examples, and hooks reference, see the main repository.

## About Yuki-no

Yuki-no is a GitHub Action that tracks changes between repositories and creates GitHub issues based on commits, ideal for documentation translation projects.
