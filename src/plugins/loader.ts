import { type Plugin, type PluginOptions } from './plugin.types';
import { type PluginConfig, type Config } from '../createConfig';
import { log } from '../utils';

const DEFAULT_CORE_PLUGINS: PluginConfig[] = [
  { name: 'core:issue-creator' },
  { name: 'core:release-tracker' },
];

export const loadPlugins = async (pluginConfigsFromUser: PluginConfig[], coreConfig: Config): Promise<Plugin[]> => {
  log('I', 'Loading plugins...');

  const finalPluginConfigs: PluginConfig[] = [...pluginConfigsFromUser];

  for (const corePlugin of DEFAULT_CORE_PLUGINS) {
    if (!pluginConfigsFromUser.find(p => p.name === corePlugin.name)) {
      finalPluginConfigs.push(corePlugin);
    }
  }

  const loadedPlugins: Plugin[] = [];

  for (const pluginConfig of finalPluginConfigs) {
    log('I', `Attempting to load plugin: ${pluginConfig.name}`);
    try {
      let pluginInstance: Plugin;
      let pluginModule;

      if (pluginConfig.name.startsWith('core:')) {
        const shortName = pluginConfig.name.substring('core:'.length);
        try {
          pluginModule = await import(`./core/${shortName}`);
        } catch (error) {
          log('E', `Failed to import core plugin "${pluginConfig.name}": ${error instanceof Error ? error.message : error}`);
          continue;
        }
      } else {
        try {
          pluginModule = await import(pluginConfig.name);
        } catch (error) {
          log('E', `Failed to import community plugin "${pluginConfig.name}": ${error instanceof Error ? error.message : error}`);
          continue;
        }
      }

      if (!pluginModule || !pluginModule.default) {
        log('E', `Plugin "${pluginConfig.name}" does not have a default export.`);
        continue;
      }

      pluginInstance = pluginModule.default as Plugin;

      if (!pluginInstance || !pluginInstance.name) {
        log('E', `Plugin "${pluginConfig.name}" is not a valid plugin (missing name or main export).`);
        continue;
      }

      // Options will be passed to lifecycle methods, not stored directly in the plugin instance here.
      // If pluginConfig.options exist, they will be accessible via pluginConfig.options when needed.
      loadedPlugins.push(pluginInstance);
      log('I', `Successfully loaded plugin: ${pluginInstance.name}`);

    } catch (error) {
      log('E', `An unexpected error occurred while loading plugin "${pluginConfig.name}": ${error instanceof Error ? error.message : error}`);
    }
  }

  log('I', `Total plugins loaded: ${loadedPlugins.length}`);
  return loadedPlugins;
};
