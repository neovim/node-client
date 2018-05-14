import { Neovim } from '../api/Neovim';
import { logger } from '../utils/logger';
import { Spec } from '../types/Spec';

export interface NvimPluginOptions {
  dev?: boolean;
}

export interface AutocmdOptions {
  pattern: string;
  eval?: string;
  sync?: boolean;
}

export interface CommandOptions {
  sync?: boolean;
  range?: string;
  nargs?: string;
  complete?: string;
}

export interface NvimFunctionOptions {
  sync?: boolean;
  range?: string;
  eval?: string;
}

export interface Handler {
  fn: Function;
  spec: Spec;
}

export function callable(fn: Function): Function;
export function callable(fn: [any, Function]): Function;
export function callable(fn: any): Function {
  logger.debug(typeof fn);
  logger.debug(`${Array.isArray(fn)}`);
  logger.debug(`${fn.length}`);
  if (typeof fn === 'function') {
    return fn;
  } else if (Array.isArray(fn) && fn.length === 2) {
    return function() {
      return fn[1].apply(fn[0], arguments);
    };
  }

  throw new Error();
}

export class NvimPlugin {
  public filename: string;
  public nvim: Neovim;
  public instance: any;

  public dev: boolean;

  public autocmds: { [index: string]: Handler };
  public commands: { [index: string]: Handler };
  public functions: { [index: string]: Handler };

  constructor(filename: string, plugin: any, nvim: Neovim) {
    this.filename = filename;
    this.nvim = nvim;
    this.dev = false;
    this.autocmds = {};
    this.commands = {};
    this.functions = {};

    // Simplifies class and decorator style plugins
    try {
      this.instance = new plugin(this);
    } catch (err) {
      if (err instanceof TypeError) {
        this.instance = plugin(this);
      } else {
        throw err;
      }
    }
  }

  setOptions(options: NvimPluginOptions) {
    this.dev = options.dev === undefined ? this.dev : options.dev;
  }

  get shouldCache() {
    return !this.dev;
  }

  registerAutocmd(name: string, fn: Function, options: AutocmdOptions): void;
  registerAutocmd(
    name: string,
    fn: [any, Function],
    options: AutocmdOptions
  ): void;
  registerAutocmd(name: string, fn: any, options?: AutocmdOptions): void {
    if (!options.pattern) {
      logger.error('registerAutocmd expected pattern option for ' + name);
      return;
    }

    const spec: Spec = {
      type: 'autocmd',
      name,
      sync: options && !!options.sync,
      opts: {},
    };

    ['pattern', 'eval'].forEach((option: keyof AutocmdOptions) => {
      if (options && typeof options[option] !== 'undefined') {
        spec.opts[option] = options[option];
      }
    });

    try {
      this.autocmds[`${name} ${options.pattern}`] = {
        fn: callable(fn),
        spec,
      };
    } catch (err) {
      logger.error('registerAutocmd expected callable argument for ' + name);
    }
  }

  registerCommand(name: string, fn: Function, options?: CommandOptions): void;
  registerCommand(
    name: string,
    fn: [any, Function],
    options?: CommandOptions
  ): void;
  registerCommand(name: string, fn: any, options?: CommandOptions): void {
    const spec: Spec = {
      type: 'command',
      name,
      sync: options && !!options.sync,
      opts: {},
    };

    ['range', 'nargs', 'complete'].forEach((option: keyof CommandOptions) => {
      if (options && typeof options[option] !== 'undefined') {
        spec.opts[option] = options[option];
      }
    });

    try {
      this.commands[name] = {
        fn: callable(fn),
        spec,
      };
    } catch (err) {
      logger.error('registerCommand expected callable argument for ' + name);
    }
  }

  registerFunction(
    name: string,
    fn: Function,
    options?: NvimFunctionOptions
  ): void;
  registerFunction(
    name: string,
    fn: [any, Function],
    options?: NvimFunctionOptions
  ): void;
  registerFunction(name: string, fn: any, options?: NvimFunctionOptions): void {
    const spec: Spec = {
      type: 'function',
      name,
      sync: options && !!options.sync,
      opts: {},
    };

    ['range', 'eval'].forEach((option: keyof NvimFunctionOptions) => {
      if (options && typeof options[option] !== 'undefined') {
        spec.opts[option] = options[option];
      }
    });

    try {
      this.functions[name] = {
        fn: callable(fn),
        spec,
      };
    } catch (err) {
      logger.error('registerFunction expected callable argument for ' + name);
    }
  }

  get specs(): Spec[] {
    const autocmds = Object.keys(this.autocmds).map(
      key => this.autocmds[key].spec
    );
    const commands = Object.keys(this.commands).map(
      key => this.commands[key].spec
    );
    const functions = Object.keys(this.functions).map(
      key => this.functions[key].spec
    );
    return autocmds.concat(commands).concat(functions);
  }

  async handleRequest(name: string, type: string, args: any[]) {
    let handlers;

    switch (type) {
      case 'autocmd':
        handlers = this.autocmds;
        break;
      case 'command':
        handlers = this.commands;
        break;
      case 'function':
        handlers = this.functions;
        break;
      default:
        const errMsg = `No handler for unknown type ${type}: "${name}" in ${
          this.filename
        }`;
        logger.error(errMsg);
        throw new Error(errMsg);
    }

    if (handlers.hasOwnProperty(name)) {
      const handler = handlers[name];
      try {
        return handler.spec.sync
          ? handler.fn(...args)
          : await handler.fn(...args);
      } catch (err) {
        const msg = `Error in plugin for ${type}:${name}: ${err.message}`;
        logger.error(`${msg} (file: ${this.filename}, stack: ${err.stack})`);
        throw new Error(err);
      }
    } else {
      const errMsg = `Missing handler for ${type}: "${name}" in ${
        this.filename
      }`;
      logger.error(errMsg);
      throw new Error(errMsg);
    }
  }
}
