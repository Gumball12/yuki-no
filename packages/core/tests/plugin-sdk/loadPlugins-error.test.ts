import { describe, expect, it, vi } from 'vitest';

describe('Plugin loader - version context on failure', () => {
  it('adds version information to error message when specified', async () => {
    vi.resetModules();
    vi.mock('../../plugin/index.ts', async importOriginal => {
      const orig =
        await importOriginal<typeof import('../../plugin/index.ts')>();
      return {
        ...orig,
        getResolveId: vi.fn((name: string) => name.split('@')[0]),
      };
    });

    const { loadPlugins } = await import('../../plugin/index.ts');
    await expect(loadPlugins(['non-existent-plugin@1.2.3'])).rejects.toThrow(
      /Failed to load plugin "/,
    );
    await expect(loadPlugins(['non-existent-plugin@1.2.3'])).rejects.toThrow(
      /Resolved ID: non-existent-plugin/,
    );
    await expect(loadPlugins(['non-existent-plugin@1.2.3'])).rejects.toThrow(
      /Original plugin specification: non-existent-plugin@1\.2\.3/,
    );
    await expect(loadPlugins(['non-existent-plugin@1.2.3'])).rejects.toThrow(
      /Version specification: 1\.2\.3/,
    );
  });
});
