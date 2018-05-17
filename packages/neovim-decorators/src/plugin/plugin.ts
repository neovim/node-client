// Plugin decorator

import { NVIM_SPEC } from './properties';
import { Neovim, NvimPlugin } from 'neovim';
import {
  PluginOptions,
  AutocmdOptions,
  CommandOptions,
  FunctionOptions
} from './types';

type Spec = {
  type: 'function' | 'autocmd' | 'command';
  name: string;
  sync: boolean;
  opts: {
    range?: string;
    nargs?: string;
    eval?: string;
    pattern?: string;
  };
};


export interface PluginWrapperConstructor {
  new (nvim: Neovim, plugin?: NvimPlugin): PluginWrapperInterface;
}
export interface PluginWrapperInterface {
  new (plugin: NvimPlugin): PluginWrapperInterface;
  setApi(nvim: Neovim): void;
}
function wrapper(cls: PluginWrapperConstructor, options?: PluginOptions): any {
  return class WrapperClass extends cls implements PluginWrapperInterface {
    public nvim: Neovim;
    constructor(plugin: NvimPlugin) {
      super(plugin.nvim, plugin);
      this.setApi(plugin.nvim);

      if (options) {
        plugin.setOptions(options);
      }

      // Search for decorated methods
      Object.getOwnPropertyNames(cls.prototype).forEach(methodName => {
        const method = cls.prototype[methodName];
        if (method && method[NVIM_SPEC]) {
          const spec: Spec = method[NVIM_SPEC];

          switch (spec.type) {
            case 'autocmd':
              const autoCmdOpts: AutocmdOptions = {
                pattern: spec.opts.pattern,
                sync: spec.sync
              };

              if (typeof spec.opts.eval !== 'undefined') {
                autoCmdOpts.eval = spec.opts.eval;
              }

              plugin.registerAutocmd(spec.name, [this, method], autoCmdOpts);
              break;
            case 'command':
              const cmdOpts: CommandOptions = {
                sync: spec.sync
              };

              if (typeof spec.opts.range !== 'undefined') {
                cmdOpts.range = spec.opts.range;
              }
              if (typeof spec.opts.nargs !== 'undefined') {
                cmdOpts.nargs = spec.opts.nargs;
              }

              plugin.registerCommand(spec.name, [this, method], cmdOpts);
              break;
            case 'function':
              const funcOpts: FunctionOptions = {
                sync: spec.sync
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
export function Plugin(
  outter: any
): (cls: PluginWrapperConstructor, options?: PluginOptions) => any;
export function Plugin(outter: any): any;
export function Plugin(outter: any): any {
  /**
   * Decorator should support
   *
   * @Plugin(opts)
   * class TestPlug {}
   *
   * and
   *
   * @PluginA
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
