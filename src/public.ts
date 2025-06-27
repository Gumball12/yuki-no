// Export plugin interface for external use
export type { YukiNoPlugin } from './plugins/core';
export { getInput, getBooleanInput, getMultilineInput } from './inputUtils';
export {
  createTestContext,
  loadPluginForTesting,
  runHook,
} from './plugins/testing-tools';
