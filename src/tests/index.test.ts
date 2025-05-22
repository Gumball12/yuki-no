// @vitest-environment node
// Mock full modules first
vi.mock('../createConfig');
vi.mock('../plugins/loader');
vi.mock('../git/core'); // Mock Git class
vi.mock('../github/core'); // Mock GitHub class
vi.mock('../utils'); // For log

import { start } from '../index'; // Assuming start is exported from index.ts
import { createConfig, type Config, type PluginConfig } from '../createConfig';
import { loadPlugins } from '../plugins/loader';
import { type Plugin } from '../plugins/plugin.types';
import { Git } from '../git/core';
import { GitHub } from '../github/core';
import { log } from '../utils';
import { type Issue } from '../github/getOpenedIssues';


describe('Main Workflow (index.ts - start function)', () => {
  const mockGitInstance = {
    clone: vi.fn(),
    exec: vi.fn(),
    // Add other methods if start() or plugins call them
  };
  const mockGithubInstance = {
    // Add methods if start() or plugins call them
  };

  const mockPlugin1: Plugin = {
    name: 'mockPlugin1',
    initialize: vi.fn().mockResolvedValue(undefined),
    preSync: vi.fn().mockResolvedValue(undefined),
    onSync: vi.fn().mockResolvedValue([] as Issue[]),
    postSync: vi.fn().mockResolvedValue(undefined),
    preReleaseTracking: vi.fn().mockResolvedValue(undefined),
    onReleaseTracking: vi.fn().mockResolvedValue(undefined),
    postReleaseTracking: vi.fn().mockResolvedValue(undefined),
    onEnd: vi.fn().mockResolvedValue(undefined),
  };

  const mockPlugin2: Plugin = {
    name: 'mockPlugin2',
    // No hooks defined, to test that undefined hooks are not called
  };
  
  const mockIssueCreatorPlugin: Plugin = {
    name: 'core:issue-creator',
    onSync: vi.fn().mockResolvedValue([{ hash: 'c1', number: 1, title: 'Issue C1' } as Issue]),
  };


  let mockLoadedPlugins: Plugin[];

  const mockUserPluginConfigs: PluginConfig[] = [
    { name: 'mockPlugin1', options: { testOption: true } },
    { name: 'mockPlugin2' },
    { name: 'core:issue-creator' }
  ];

  const mockFullConfig: Config = {
    accessToken: 'test-token',
    userName: 'test-user',
    email: 'test@example.com',
    upstreamRepoSpec: { owner: 'up', name: 'repo', branch: 'main' },
    headRepoSpec: { owner: 'head', name: 'repo', branch: 'main' },
    trackFrom: 'abc',
    include: [],
    exclude: [],
    labels: ['sync'],
    releaseTracking: false,
    releaseTrackingLabels: ['pending'],
    verbose: false,
    plugins: mockUserPluginConfigs, // Crucial: This should align with what getPluginOptions expects
  };


  beforeEach(() => {
    vi.clearAllMocks();

    // Mock createConfig to return our controlled config
    vi.mocked(createConfig).mockReturnValue(mockFullConfig);

    // Mock Git and GitHub constructors
    vi.mocked(Git).mockImplementation(() => mockGitInstance as unknown as Git);
    vi.mocked(GitHub).mockImplementation(() => mockGithubInstance as unknown as GitHub);
    
    // Reset plugins for each test to avoid interference
    mockPlugin1.initialize = vi.fn().mockResolvedValue(undefined);
    mockPlugin1.preSync = vi.fn().mockResolvedValue(undefined);
    mockPlugin1.onSync = vi.fn().mockResolvedValue([] as Issue[]);
    mockPlugin1.postSync = vi.fn().mockResolvedValue(undefined);
    mockPlugin1.preReleaseTracking = vi.fn().mockResolvedValue(undefined);
    mockPlugin1.onReleaseTracking = vi.fn().mockResolvedValue(undefined);
    mockPlugin1.postReleaseTracking = vi.fn().mockResolvedValue(undefined);
    mockPlugin1.onEnd = vi.fn().mockResolvedValue(undefined);

    mockIssueCreatorPlugin.onSync = vi.fn().mockResolvedValue([{ hash: 'c1', number: 1, title: 'Issue C1' } as Issue]);
    
    mockLoadedPlugins = [mockPlugin1, mockPlugin2, mockIssueCreatorPlugin];
    vi.mocked(loadPlugins).mockResolvedValue(mockLoadedPlugins);

  });

  it('calls plugin lifecycle hooks in correct order (no release tracking)', async () => {
    mockFullConfig.releaseTracking = false; // Ensure this is set for the test
    vi.mocked(createConfig).mockReturnValue(mockFullConfig); // Re-apply for this test case

    await start();

    // Check order of calls
    const initOrder = mockPlugin1.initialize!.mock.invocationCallOrder[0];
    const preSyncOrder = mockPlugin1.preSync!.mock.invocationCallOrder[0];
    const onSyncOrder = mockPlugin1.onSync!.mock.invocationCallOrder[0]; // and issueCreator.onSync
    const issueCreatorOnSyncOrder = mockIssueCreatorPlugin.onSync!.mock.invocationCallOrder[0];
    const postSyncOrder = mockPlugin1.postSync!.mock.invocationCallOrder[0];
    const onEndOrder = mockPlugin1.onEnd!.mock.invocationCallOrder[0];

    expect(initOrder).toBeLessThan(preSyncOrder);
    expect(preSyncOrder).toBeLessThan(onSyncOrder);
    expect(preSyncOrder).toBeLessThan(issueCreatorOnSyncOrder); // onSync hooks run together
    expect(onSyncOrder).toBeLessThan(postSyncOrder);
    expect(issueCreatorOnSyncOrder).toBeLessThan(postSyncOrder);
    expect(postSyncOrder).toBeLessThan(onEndOrder);


    // Verify calls with correct arguments
    expect(mockPlugin1.initialize).toHaveBeenCalledWith(mockFullConfig, { testOption: true });
    expect(mockPlugin1.preSync).toHaveBeenCalledWith(mockFullConfig, expect.any(Git), expect.any(GitHub), { testOption: true });
    
    // onSync for mockPlugin1 (returns empty array)
    expect(mockPlugin1.onSync).toHaveBeenCalledWith(mockFullConfig, expect.any(Git), expect.any(GitHub), { testOption: true });
    // onSync for core:issue-creator (returns one issue)
    expect(mockIssueCreatorPlugin.onSync).toHaveBeenCalledWith(mockFullConfig, expect.any(Git), expect.any(GitHub), undefined); // core:issue-creator has no options in mockUserPluginConfigs
    
    // postSync should receive combined issues from all onSync hooks
    const expectedCreatedIssues = [{ hash: 'c1', number: 1, title: 'Issue C1' }];
    expect(mockPlugin1.postSync).toHaveBeenCalledWith(mockFullConfig, expect.any(Git), expect.any(GitHub), expectedCreatedIssues, { testOption: true });
    
    expect(mockPlugin1.onEnd).toHaveBeenCalledWith(mockFullConfig, { testOption: true });

    // Release tracking hooks should not be called
    expect(mockPlugin1.preReleaseTracking).not.toHaveBeenCalled();
    expect(mockPlugin1.onReleaseTracking).not.toHaveBeenCalled();
    expect(mockPlugin1.postReleaseTracking).not.toHaveBeenCalled();
    
    // Check hooks not defined on mockPlugin2 were not called
    expect(mockPlugin2.initialize).toBeUndefined(); // Or .not.toHaveBeenCalled() if it was a vi.fn()
  });

  it('calls release tracking hooks when config.releaseTracking is true', async () => {
    mockFullConfig.releaseTracking = true;
    vi.mocked(createConfig).mockReturnValue(mockFullConfig); // Re-apply
    // Mock getOpenedIssues which is called in index.ts before preReleaseTracking if releaseTracking is true
    vi.mock('../github/getOpenedIssues', () => ({
        getOpenedIssues: vi.fn().mockResolvedValue([{ hash: 'existing', number: 99 } as Issue]),
    }));


    await start();

    const postSyncOrder = mockPlugin1.postSync!.mock.invocationCallOrder[0];
    const preReleaseTrackingOrder = mockPlugin1.preReleaseTracking!.mock.invocationCallOrder[0];
    const onReleaseTrackingOrder = mockPlugin1.onReleaseTracking!.mock.invocationCallOrder[0];
    const postReleaseTrackingOrder = mockPlugin1.postReleaseTracking!.mock.invocationCallOrder[0];
    const onEndOrder = mockPlugin1.onEnd!.mock.invocationCallOrder[0];
    
    expect(postSyncOrder).toBeLessThan(preReleaseTrackingOrder);
    expect(preReleaseTrackingOrder).toBeLessThan(onReleaseTrackingOrder);
    expect(onReleaseTrackingOrder).toBeLessThan(postReleaseTrackingOrder);
    expect(postReleaseTrackingOrder).toBeLessThan(onEndOrder);

    expect(mockPlugin1.preReleaseTracking).toHaveBeenCalledWith(mockFullConfig, expect.any(Git), expect.any(GitHub), { testOption: true });
    
    const combinedIssuesForReleaseTracking = [
        { hash: 'existing', number: 99 }, // from getOpenedIssues mock
        { hash: 'c1', number: 1, title: 'Issue C1' }, // from core:issue-creator.onSync
    ];
    // Need to sort by hash as uniqueWith in index.ts does
    const sortedCombinedIssues = combinedIssuesForReleaseTracking.sort((a,b) => a.hash.localeCompare(b.hash));

    expect(mockPlugin1.onReleaseTracking).toHaveBeenCalledWith(mockFullConfig, expect.any(Git), expect.any(GitHub), expect.arrayContaining(sortedCombinedIssues), { testOption: true });
    expect(mockPlugin1.postReleaseTracking).toHaveBeenCalledWith(mockFullConfig, expect.any(Git), expect.any(GitHub), { testOption: true });
  });

  it('handles plugin hook error gracefully and calls other hooks', async () => {
    consterrorMessage = 'Plugin hook failed';
    mockPlugin1.preSync = vi.fn().mockRejectedValue(new Error(errorMessage));
    vi.mocked(loadPlugins).mockResolvedValue([mockPlugin1, mockIssueCreatorPlugin]); // Ensure mockPlugin1 is used


    await start();

    expect(log).toHaveBeenCalledWith('E', expect.stringContaining(`Error during preSync for plugin mockPlugin1: Error: ${errorMessage}`));
    
    // Other hooks should still be called
    expect(mockPlugin1.initialize).toHaveBeenCalled();
    expect(mockIssueCreatorPlugin.onSync).toHaveBeenCalled(); // onSync for other plugins
    expect(mockPlugin1.postSync).toHaveBeenCalled(); // postSync for the failing plugin
    expect(mockPlugin1.onEnd).toHaveBeenCalled();
  });
  
  it('correctly uses plugin options defined in config for getPluginOptions', async () => {
    // Config has mockPlugin1 with { testOption: true }
    // Config has core:issue-creator with no options
    // Config has mockPlugin2 with no options
    
    await start();

    expect(mockPlugin1.initialize).toHaveBeenCalledWith(mockFullConfig, { testOption: true });
    expect(mockIssueCreatorPlugin.onSync).toHaveBeenCalledWith(mockFullConfig, expect.any(Git), expect.any(GitHub), undefined); // No options for core:issue-creator in this config
  });
});
