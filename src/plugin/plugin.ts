// Plugin decorator
import { logger } from '../utils/logger';

import { NVIM_SPEC } from './properties';
import { Neovim } from '../api/Neovim';
import {
  NvimPlugin,
  AutocmdOptions,
  CommandOptions,
  NvimFunctionOptions,
} from '../host/NvimPlugin';
import { Spec } from '../types/Spec';

export { Neovim, NvimPlugin };

export interface PluginDecoratorOptions {
  dev?: boolean;
}

export type Constructor<T> = { new (...args: any[]): T };

function wrapper<T extends Constructor<{}>>(
  cls: T,
  options?: PluginDecoratorOptions
) {
  logger.info(`Decorating class ${cls}`);

  return class extends cls {
    public nvim: Neovim;
    constructor(...args: any[]) {
      const plugin: NvimPlugin = args[0];
      super(plugin.nvim, plugin);
      this.setApi(plugin.nvim);

      if (options) {
        plugin.setOptions(options);
      }

      // Search for decorated methods
      Object.getOwnPropertyNames(cls.prototype).forEach(methodName => {
        logger.info(`Method name ${methodName}`);
        logger.info(
          `${cls.prototype[methodName]} ${typeof cls.prototype[methodName]}`
        );
        logger.info(`${this} ${typeof this}`);

        const method = cls.prototype[methodName];
        if (method && method[NVIM_SPEC]) {
          const spec: Spec = method[NVIM_SPEC];

          switch (spec.type) {
            case 'autocmd':
              const autoCmdOpts: AutocmdOptions = {
                pattern: spec.opts.pattern,
                sync: spec.sync,
              };

              if (typeof spec.opts.eval !== 'undefined') {
                autoCmdOpts.eval = spec.opts.eval;
              }

              plugin.registerAutocmd(spec.name, [this, method], autoCmdOpts);
              break;
            case 'command':
              const cmdOpts: CommandOptions = {
                sync: spec.sync,
              };

              if (typeof spec.opts.range !== 'undefined') {
                cmdOpts.range = spec.opts.range;
              }
              if (typeof spec.opts.nargs !== 'undefined') {
                cmdOpts.nargs = spec.opts.nargs;
              }
              if (typeof spec.opts.complete !== 'undefined') {
                cmdOpts.complete = spec.opts.complete;
              }

              plugin.registerCommand(spec.name, [this, method], cmdOpts);
              break;
            case 'function':
              const funcOpts: NvimFunctionOptions = {
                sync: spec.sync,
              };

              if (typeof spec.opts.range !== 'undefined') {
                funcOpts.range = spec.opts.range;
              }
              if (typeof spec.opts.eval !== 'undefined') {
                funcOpts.eval = spec.opts.eval;
              }

              plugin.registerFunction(spec.name, [this, method], funcOpts);
              break;
            default:
              break;
          }
        }
      });
    }
    setApi(nvim: Neovim) {
      this.nvim = nvim;
    }
  };
}

// Can decorate a class with options object
export function plugin(
  outter: any
): (cls: Constructor<{}>, options?: PluginDecoratorOptions) => any;
export function plugin(outter: any): any;
export function plugin(outter: any): any {
  /**
   * Decorator should support
   *
   * @Plugin(opts)
   * class TestPlug {}
   *
   * and
   *
   * @Plugin
   * class TestPlug {}
   *
   *and
   *
   * Plugin(opts)(TestPlugin)
   *
   * or
   *
   * Plugin(TestPlugin)
   */
  return typeof outter !== 'function'
    ? (cls: any) => wrapper(cls, outter)
    : wrapper(outter);
}
