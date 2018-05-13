// import * as Module from 'module';
import * as path from 'path';
import * as util from 'util';
import * as vm from 'vm';

import { omit, defaults } from 'lodash';

import { Neovim } from '../api/Neovim';
import { logger } from '../utils/logger';
import { DevNull } from '../utils/devnull';

import { NvimPlugin } from './NvimPlugin';

export interface IModule {
  new (name: string): any;
  _resolveFilename: (file: string, context: any) => string;
  _extensions: {};
  _cache: { [file: string]: any };
  _compile: () => void;
  wrap: (content: string) => string;
  require: (file: string) => NodeModule;
  _nodeModulePaths: (filename: string) => string[];
}

export type LoadPluginOptions = {
  cache?: boolean;
};

const Module: IModule = require('module');
const BLACKLISTED_GLOBALS = [
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

// @see node/lib/internal/module.js
function makeRequireFunction() {
  const require: any = (p: string) => this.require(p);
  require.resolve = (request: string) => Module._resolveFilename(request, this);
  require.main = process.mainModule;
  // Enable support to add extra extension types
  require.extensions = Module._extensions;
  require.cache = Module._cache;
  return require;
}

// @see node/lib/module.js
function compileInSandbox(sandbox: ISandbox) {
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

function createDebugFunction(filename: string) {
  return (...args: any[]) => {
    const debugId = path.basename(filename);
    const sout = util.format.apply(null, [`[${debugId}]`].concat(args));
    logger.info(sout);
  };
}

export interface ISandbox {
  process: NodeJS.Process;
  module: NodeModule;
  require: (p: string) => any;
  console: { [key in keyof Console]?: Function };
}

function createSandbox(filename: string): ISandbox {
  const module = new Module(filename);
  module.paths = Module._nodeModulePaths(filename);

  const sandbox = <ISandbox>vm.createContext({
    module,
    console: {},
  });

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
  sandbox.process = <NodeJS.Process>omit(process, BLACKLISTED_GLOBALS);

  const devNull = new DevNull();
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
  const debug = createDebugFunction(filename);

  try {
    const sandbox = createSandbox(filename);

    // Clear module from cache
    if (options && !options.cache) {
      delete Module._cache[require.resolve(filename)];
    }

    // attempt to import plugin
    // Require plugin to export a class
    const defaultImport = sandbox.require(filename);
    const plugin = (defaultImport && defaultImport.default) || defaultImport;

    if (typeof plugin === 'function') {
      return new NvimPlugin(filename, plugin, nvim);
    }
  } catch (err) {
    debug(`Error loading child ChildPlugin ${filename}`);
    debug(err);
  }

  // There may have been an error, but maybe not
  return null;
}

export function loadPlugin(
  filename: string,
  nvim: Neovim,
  options: LoadPluginOptions = {}
) {
  try {
    return createPlugin(filename, nvim, options);
  } catch (err) {
    // logger.error(`Could not load plugin "${filename}":`, err, err.stack);
    return null;
  }
}
