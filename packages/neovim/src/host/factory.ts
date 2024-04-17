import * as path from 'node:path';
import Module = require('module');

import { Neovim } from '../api/Neovim';

import { NvimPlugin } from './NvimPlugin';

export interface LoadPluginOptions {
  cache?: boolean;
}

// inspiration drawn from Module
function createPlugin(
  filename: string,
  nvim: Neovim,
  options: LoadPluginOptions = {}
): NvimPlugin | null {
  try {
    nvim.logger.debug(
      `createPlugin.${filename}.clearCache: ${options && !options.cache}`
    );

    // Clear module from cache
    if (options && !options.cache) {
      try {
        // `as any` to access hidden API
        delete (Module as any)._cache[require.resolve(filename)];
      } catch (err) {
        // possible this doesn't exist in cache, ignore
      }
    }

    // attempt to import plugin
    // Require plugin to export a class
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires, import/no-dynamic-require
    const defaultImport = require(filename);
    const plugin = (defaultImport && defaultImport.default) || defaultImport;

    if (typeof plugin === 'function') {
      return new NvimPlugin(filename, plugin, nvim);
    }
  } catch (e) {
    const err = e as Error;
    const file = path.basename(filename);
    nvim.logger.error(`[${file}] ${err.stack}`);
    nvim.logger.error(`[${file}] Error loading child ChildPlugin ${filename}`);
  }

  // There may have been an error, but maybe not
  return null;
}

export function loadPlugin(
  filename: string,
  nvim: Neovim,
  options: LoadPluginOptions = {}
): NvimPlugin | null {
  try {
    return createPlugin(filename, nvim, options);
  } catch (err) {
    // logger.error(`Could not load plugin "${filename}":`, err, err.stack);
    return null;
  }
}
