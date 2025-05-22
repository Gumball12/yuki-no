// @vitest-environment node
import { loadPlugins } from '../../plugins/loader';
import { type PluginConfig, type Config } from '../../createConfig';
import { log } from '../../utils';

// Mock core plugins
const mockIssueCreator = {
  name: 'core:issue-creator',
  initialize: vi.fn(),
  onSync: vi.fn().mockResolvedValue([]),
};
const mockReleaseTracker = {
  name: 'core:release-tracker',
  initialize: vi.fn(),
  onReleaseTracking: vi.fn(),
};

vi.mock('../../plugins/core/issue-creator', () => ({
  default: mockIssueCreator,
}));
vi.mock('../../plugins/core/release-tracker', () => ({
  default: mockReleaseTracker,
}));

// Mock the log utility to spy on error messages
vi.mock('../../utils', async () => {
  const actualUtils = await vi.importActual('../../utils');
  return {
    ...actualUtils,
    log: vi.fn(),
  };
});


// Mock Config
const mockCoreConfig = {
  plugins: [], // This will be populated by pluginConfigsFromUser in loadPlugins
  // Add other necessary Config properties if your plugins or loader access them
} as unknown as Config;


describe('Plugin Loader - loadPlugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads default core plugins when no user plugins are provided', async () => {
    const userPlugins: PluginConfig[] = [];
    const loaded = await loadPlugins(userPlugins, mockCoreConfig);

    expect(loaded.length).toBe(2);
    expect(loaded.find(p => p.name === 'core:issue-creator')).toBeDefined();
    expect(loaded.find(p => p.name === 'core:release-tracker')).toBeDefined();
    expect(log).not.toHaveBeenCalledWith('E', expect.anything());
  });

  it('loads default core plugins plus user-defined community plugin', async () => {
    const mockCommunityPlugin = { name: 'test-community-plugin', initialize: vi.fn() };
    vi.mock('test-community-plugin', () => ({ default: mockCommunityPlugin }), { virtual: true });

    const userPlugins: PluginConfig[] = [{ name: 'test-community-plugin' }];
    const loaded = await loadPlugins(userPlugins, mockCoreConfig);

    expect(loaded.length).toBe(3);
    expect(loaded.find(p => p.name === 'core:issue-creator')).toBeDefined();
    expect(loaded.find(p => p.name === 'core:release-tracker')).toBeDefined();
    expect(loaded.find(p => p.name === 'test-community-plugin')).toBe(mockCommunityPlugin);
    expect(log).not.toHaveBeenCalledWith('E', expect.anything());
  });

  it('loads user-defined core plugin, overriding default, and other defaults', async () => {
    // User provides 'core:issue-creator' with specific options (options handling is outside loader)
    const userPlugins: PluginConfig[] = [{ name: 'core:issue-creator', options: { custom: true } }];
    const loaded = await loadPlugins(userPlugins, mockCoreConfig);

    expect(loaded.length).toBe(2); // core:issue-creator (user) + core:release-tracker (default)
    const issueCreator = loaded.find(p => p.name === 'core:issue-creator');
    expect(issueCreator).toBe(mockIssueCreator); // Should be the mocked instance
    expect(loaded.find(p => p.name === 'core:release-tracker')).toBeDefined();
    expect(log).not.toHaveBeenCalledWith('E', expect.anything());
  });


  it('handles non-existent community plugin and logs error', async () => {
    const userPlugins: PluginConfig[] = [{ name: 'non-existent-plugin' }];
    // Make dynamic import fail for this specific plugin
    vi.mock('non-existent-plugin', () => { throw new Error('Cannot find module'); }, { virtual: true });

    const loaded = await loadPlugins(userPlugins, mockCoreConfig);

    // Should still load default core plugins
    expect(loaded.length).toBe(2);
    expect(loaded.find(p => p.name === 'core:issue-creator')).toBeDefined();
    expect(loaded.find(p => p.name === 'core:release-tracker')).toBeDefined();
    expect(loaded.find(p => p.name === 'non-existent-plugin')).toBeUndefined();
    expect(log).toHaveBeenCalledWith('E', expect.stringContaining('Failed to import community plugin "non-existent-plugin"'));
  });

  it('handles community plugin without default export and logs error', async () => {
    vi.mock('no-default-export-plugin', () => ({ notDefault: { name: 'no-default-export-plugin' } }), { virtual: true });
    const userPlugins: PluginConfig[] = [{ name: 'no-default-export-plugin' }];
    const loaded = await loadPlugins(userPlugins, mockCoreConfig);

    expect(loaded.length).toBe(2); // Only core plugins
    expect(log).toHaveBeenCalledWith('E', expect.stringContaining('Plugin "no-default-export-plugin" does not have a default export.'));
  });

  it('handles community plugin that is not a valid plugin (e.g. missing name) and logs error', async () => {
    vi.mock('invalid-plugin-structure', () => ({ default: { initialize: vi.fn() } }), { virtual: true }); // Missing 'name'
    const userPlugins: PluginConfig[] = [{ name: 'invalid-plugin-structure' }];
    const loaded = await loadPlugins(userPlugins, mockCoreConfig);
    
    expect(loaded.length).toBe(2); // Only core plugins
    expect(log).toHaveBeenCalledWith('E', expect.stringContaining('Plugin "invalid-plugin-structure" is not a valid plugin (missing name or main export).'));
  });

  it('does not load a core plugin if its import fails', async () => {
    // Temporarily break the mock for issue-creator
    vi.doMock('../../plugins/core/issue-creator', () => { throw new Error('Simulated import error for core plugin'); });

    const userPlugins: PluginConfig[] = [];
    const loaded = await loadPlugins(userPlugins, mockCoreConfig);

    expect(loaded.length).toBe(1); // Only release-tracker should load
    expect(loaded.find(p => p.name === 'core:release-tracker')).toBeDefined();
    expect(loaded.find(p => p.name === 'core:issue-creator')).toBeUndefined();
    expect(log).toHaveBeenCalledWith('E', expect.stringContaining('Failed to import core plugin "core:issue-creator"'));
    
    // Restore mock for other tests
    vi.doMock('../../plugins/core/issue-creator', () => ({ default: mockIssueCreator }));
  });
});
