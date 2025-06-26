import { getInput } from '../../inputUtils';
import type { YukiNoPlugin } from '../core';

const plugin: YukiNoPlugin = {
  name: 'yuki-no-example',
  onInit(ctx) {
    // Plugins can read raw inputs defined in the workflow's `with` block via
    // `ctx.inputs`. This example expects a value named `my-plugin-input`:
    //
    // ```yaml
    // - uses: Gumball12/yuki-no@v1
    //   with:
    //     plugins: |
    //       ./plugins/example/index.js
    //     my-plugin-input: some-token
    // ```
    //
    // Use the provided helpers to parse these values when needed.
    const token = getInput(ctx.inputs, 'my-plugin-input');
    if (token) {
      console.log(`my-plugin-input: ${token}`);
    }
  },
  onBeforeCompare() {},
  onAfterCompare() {},
  onBeforeCreateIssue() {},
  onAfterCreateIssue() {},
  onExit() {},
  onError() {},
};

export default plugin;
