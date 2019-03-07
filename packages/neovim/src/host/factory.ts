import * as path from 'path';
import * as util from 'util';
import * as vm from 'vm';

import { omit, defaults } from 'lodash';

import { Neovim } from '../api/Neovim';
import { logger } from '../utils/logger';
import { DevNull } from '../utils/devnull';

import { NvimPlugin } from './NvimPlugin';

export interface Module {
  new (name: string): any;
  _resolveFilename: (file: string, context: any) => string;
  _extensions: {};
  _cache: { [file: string]: any };
  _compile: () => void;
  wrap: (content: string) => string;
  require: (file: string) => NodeModule;
  _nodeModulePaths: (filename: string) => string[];
}

export interface LoadPluginOptions {
  cache?: boolean;
}

// eslint-disable-next-line
const Module: Module = require('module');

const REMOVED_GLOBALS = [
  'reallyExit',
  'abort',
  'chdir',
  'umask',
  'setuid',
  'setgid',
  'setgroups',
  '_kill',
  'EventEmitter',
  '_maxListeners',
  '_fatalException',
  'exit',
  'kill',
];

function removedGlobalStub(name: string): Function {
  return () => {
    throw new Error(`process.${name}() is not allowed in Plugin sandbox`);
  };
}

interface Require {
  (p: string): any;
  resolve: (request: string) => any;
  main: any;
  extensions: any;
  cache: any;
}

// @see node/lib/internal/module.js
function makeRequireFunction(): Require {
  const require = ((p: string): any => this.require(p)) as Require;
  require.resolve = (request: string) => Module._resolveFilename(request, this);
  require.main = process.mainModule;
  // Enable support to add extra extension types
  require.extensions = Module._extensions;
  require.cache = Module._cache;
  return require;
}

// @see node/lib/module.js
function compileInSandbox(sandbox: Sandbox): Function {
  // eslint-disable-next-line
  return function(content: string, filename: string) {
    const require = makeRequireFunction.call(this);
    const dirname = path.dirname(filename);
    // remove shebang
    // eslint-disable-next-line
    const newContent = content.replace(/^\#\!.*/, '');
    const wrapper = Module.wrap(newContent);
    const compiledWrapper = vm.runInContext(wrapper, sandbox, { filename });
    const args = [this.exports, require, this, filename, dirname];
    return compiledWrapper.apply(this.exports, args);
  };
}

function createDebugFunction(filename: string): Function {
  return (...args: any[]) => {
    const debugId = path.basename(filename);
    const sout = util.format.apply(null, [`[${debugId}]`].concat(args));
    logger.info(sout);
  };
}

export interface Sandbox {
  process: NodeJS.Process;
  module: NodeModule;
  require: (p: string) => any;
  console: { [key in keyof Console]?: Function };
}

function createSandbox(filename: string): Sandbox {
  const module = new Module(filename);
  module.paths = Module._nodeModulePaths(filename);

  const sandbox = vm.createContext({
    module,
    console: {},
  }) as Sandbox;

  defaults(sandbox, global);

  // Redirect console calls into logger
  Object.keys(console).forEach((k: keyof Console) => {
    if (k === 'log') {
      sandbox.console.log = createDebugFunction(filename);
    } else if (k in logger) {
      sandbox.console[k] = logger[k];
    }
  });

  sandbox.require = function sandboxRequire(p) {
    const oldCompile = Module.prototype._compile;
    Module.prototype._compile = compileInSandbox(sandbox);
    const moduleExports = sandbox.module.require(p);
    Module.prototype._compile = oldCompile;
    return moduleExports;
  };

  // patch `require` in sandbox to run loaded module in sandbox context
  // if you need any of these, it might be worth discussing spawning separate processes
  sandbox.process = omit(process, REMOVED_GLOBALS) as NodeJS.Process;

  REMOVED_GLOBALS.forEach(name => {
    sandbox.process[name] = removedGlobalStub(name);
  });

  const devNull = new DevNull();

  // read-only umask
  sandbox.process.umask = (mask: number) => {
    if (typeof mask !== 'undefined') {
      throw new Error('Cannot use process.umask() to change mask (read-only)');
    }
    return process.umask();
  };

  sandbox.process.stdin = devNull;
  sandbox.process.stdout = devNull;
  sandbox.process.stderr = devNull;

  return sandbox;
}

// inspiration drawn from Module
function createPlugin(
  filename: string,
  nvim: Neovim,
  options: LoadPluginOptions = {}
): NvimPlugin | null {
  try {
    const sandbox = createSandbox(filename);

    logger.debug(
      `createPlugin.${filename}.clearCache: ${options && !options.cache}`
    );

    // Clear module from cache
    if (options && !options.cache) {
      try {
        delete Module._cache[require.resolve(filename)];
      } catch (err) {
        // possible this doesn't exist in cache, ignore
      }
    }

    // attempt to import plugin
    // Require plugin to export a class
    const defaultImport = sandbox.require(filename);
    const plugin = (defaultImport && defaultImport.default) || defaultImport;

    if (typeof plugin === 'function') {
      return new NvimPlugin(filename, plugin, nvim);
    }
  } catch (err) {
    const file = path.basename(filename);
    logger.error(`[${file}] ${err.stack}`);
    logger.error(`[${file}] Error loading child ChildPlugin ${filename}`);
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
