// Plugin decorator

import { NVIM_PLUGIN, NVIM_DEV_MODE } from './properties';
import { Neovim } from '../api/Neovim';

export interface PluginWrapperConstructor {
  new (nvim: Neovim): PluginWrapperInterface;
}
export interface PluginWrapperInterface extends PluginWrapperConstructor {
  setApi(nvim: Neovim): void;
}
export interface PluginDecoratorOptions {
  dev?: boolean;
}
function wrapper(
  cls: PluginWrapperConstructor,
  options?: PluginDecoratorOptions
): PluginWrapperConstructor {
  class WrapperClass extends cls implements PluginWrapperInterface {
    public nvim: Neovim;
    constructor(nvim: Neovim) {
      super(nvim);
      this.setApi(nvim);
    }
    setApi(nvim: Neovim) {
      this.nvim = nvim;
    }
  }
  Object.defineProperty(WrapperClass, NVIM_PLUGIN, { value: true });

  if (options && options.dev) {
    Object.defineProperty(WrapperClass, NVIM_DEV_MODE, { value: true });
  }
  return WrapperClass;
}

// Can decorate a class with options object
export function plugin<T extends { new(nvim: Neovim): {}}>(outer: any): (constructor: T) => T {
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
	return <any>(typeof outer !== 'function'
	? (cls: T) => wrapper(<any>cls, outer)
    : wrapper(outer));
}
