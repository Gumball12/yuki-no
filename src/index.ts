import { type Config, createConfig, type PluginConfig } from './createConfig';
import { Git } from './git/core';
import { getCommits } from './git/getCommits';
import { getRelease } from './git/getRelease';
import { hasAnyRelease } from './git/hasAnyRelease';
import { GitHub } from './github/core';
import { createIssue } from './github/createIssue';
import { getLatestSuccessfulRunISODate } from './github/getLatestSuccessfulRunISODate';
import { getOpenedIssues, type Issue } from './github/getOpenedIssues';
import { lookupCommitsInIssues } from './github/lookupCommitsInIssues';
import { loadPlugins } from './plugins/loader';
import { type Plugin } from './plugins/plugin.types';
import { updateIssueCommentByRelease } from './releaseTracking/updateIssueCommentsByRelease';
import { updateIssueLabelsByRelease } from './releaseTracking/updateIssueLabelsByRelease';
import { log, mergeArray, uniqueWith } from './utils';

import shell from 'shelljs';

shell.config.silent = true;

const start = async () => {
  const startTime = new Date();
  log('I', `Starting Yuki-no (${startTime.toISOString()})`);

  const config = createConfig();
  log('S', 'Configuration initialized');

  const plugins: Plugin[] = await loadPlugins(config.plugins, config);
  log('I', `Loaded ${plugins.length} plugins: ${plugins.map(p => p.name).join(', ')}`);

  const getPluginOptions = (pluginName: string) => {
    const pluginConfig = config.plugins.find(p => p.name === pluginName);
    return pluginConfig?.options;
  };

  for (const plugin of plugins) {
    if (plugin.initialize) {
      try {
        log('I', `Executing initialize for plugin: ${plugin.name}`);
        await plugin.initialize(config, getPluginOptions(plugin.name));
      } catch (error) {
        log('E', `Error during initialize for plugin ${plugin.name}: ${error}`);
      }
    }
  }

  const git = new Git({ ...config, repoSpec: config.headRepoSpec });
  git.clone();
  git.exec(`config user.name "${config.userName}"`);
  git.exec(`config user.email "${config.email}"`);
  log('S', 'Git initialized');

  const github = new GitHub({ ...config, repoSpec: config.upstreamRepoSpec });
  log('S', 'GitHub initialized');

  for (const plugin of plugins) {
    if (plugin.preSync) {
      try {
        log('I', `Executing preSync for plugin: ${plugin.name}`);
        await plugin.preSync(config, git, github, getPluginOptions(plugin.name));
      } catch (error) {
        log('E', `Error during preSync for plugin ${plugin.name}: ${error}`);
      }
    }
  }

  let createdIssues: Issue[] = [];
  log('I', '=== Synchronization started ===');
  for (const plugin of plugins) {
    if (plugin.onSync) {
      try {
        log('I', `Executing onSync for plugin: ${plugin.name}`);
        const issuesFromPlugin = await plugin.onSync(config, git, github, getPluginOptions(plugin.name));
        if (issuesFromPlugin) {
          createdIssues = createdIssues.concat(issuesFromPlugin);
        }
        log('S', `Plugin ${plugin.name} created ${issuesFromPlugin?.length || 0} issues.`);
      } catch (error) {
        log('E', `Error during onSync for plugin ${plugin.name}: ${error}`);
      }
    }
  }
  log('S', `Total issues created by onSync hooks: ${createdIssues.length}`);

  for (const plugin of plugins) {
    if (plugin.postSync) {
      try {
        log('I', `Executing postSync for plugin: ${plugin.name}`);
        await plugin.postSync(config, git, github, createdIssues, getPluginOptions(plugin.name));
      } catch (error) {
        log('E', `Error during postSync for plugin ${plugin.name}: ${error}`);
      }
    }
  }

  if (config.releaseTracking) {
    const openedIssues = await getOpenedIssues(github);
    const allRelevantIssues = uniqueWith(
      mergeArray(openedIssues, createdIssues),
      ({ hash }) => hash,
    );
    log('I', `Total relevant issues for release tracking: ${allRelevantIssues.length}`);

    for (const plugin of plugins) {
      if (plugin.preReleaseTracking) {
        try {
          log('I', `Executing preReleaseTracking for plugin: ${plugin.name}`);
          await plugin.preReleaseTracking(config, git, github, getPluginOptions(plugin.name));
        } catch (error) {
          log('E', `Error during preReleaseTracking for plugin ${plugin.name}: ${error}`);
        }
      }
    }

    log('I', '=== Release tracking execution phase ===');
    for (const plugin of plugins) {
      if (plugin.onReleaseTracking) {
        try {
          log('I', `Executing onReleaseTracking for plugin: ${plugin.name}`);
          await plugin.onReleaseTracking(config, git, github, allRelevantIssues, getPluginOptions(plugin.name));
        } catch (error) {
          log('E', `Error during onReleaseTracking for plugin ${plugin.name}: ${error}`);
        }
      }
    }

    for (const plugin of plugins) {
      if (plugin.postReleaseTracking) {
        try {
          log('I', `Executing postReleaseTracking for plugin: ${plugin.name}`);
          await plugin.postReleaseTracking(config, git, github, getPluginOptions(plugin.name));
        } catch (error) {
          log('E', `Error during postReleaseTracking for plugin ${plugin.name}: ${error}`);
        }
      }
    }
  }

  for (const plugin of plugins) {
    if (plugin.onEnd) {
      try {
        log('I', `Executing onEnd for plugin: ${plugin.name}`);
        await plugin.onEnd(config, getPluginOptions(plugin.name));
      } catch (error) {
        log('E', `Error during onEnd for plugin ${plugin.name}: ${error}`);
      }
    }
  }

  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  log(
    'S',
    `Yuki-No completed (${endTime.toISOString()}) - Duration: ${duration}s`,
  );
};

start();
