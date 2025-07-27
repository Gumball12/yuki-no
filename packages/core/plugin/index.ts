import type { YukiNoPlugin } from '../types/plugin';

export const loadPlugins = async (names: string[]): Promise<YukiNoPlugin[]> => {
  const plugins: YukiNoPlugin[] = [];

  for (const name of names) {
    try {
      const id = getResolveId(name);
      const mod = await import(id);
      const plugin = mod.default as YukiNoPlugin | undefined;

      if (!plugin) {
        throw new Error(
          `Plugin "${name}" does not export a default plugin object`,
        );
      }

      if (!plugin.name) {
        throw new Error(`Plugin "${name}" must have a "name" property`);
      }

      plugins.push(plugin);
    } catch (error) {
      const err = error as Error;
      const resolvedId = getResolveId(name);
      const contextInfo = [
        `Failed to load plugin "${name}": ${err.message}`,
        `Resolved ID: ${resolvedId}`,
        `Original plugin specification: ${name}`,
      ];

      // Add version info if available
      if (name !== resolvedId) {
        const versionPart = name.replace(resolvedId, '').replace(/^@/, '');
        if (versionPart) {
          contextInfo.push(`Version specification: ${versionPart}`);
        }
      }

      throw new Error(contextInfo.join('\n'));
    }
  }

  return plugins;
};

export const getResolveId = (name: string): string => {
  const isScopedPackage = name.startsWith('@');
  if (isScopedPackage) {
    return name.split('@').slice(0, 2).join('@');
  }

  const hasVersion = name.includes('@');
  if (hasVersion) {
    return name.split('@')[0];
  }

  return name;
};
