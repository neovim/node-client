// Plugin decorator

import { NVIM_PLUGIN, NVIM_DEV_MODE } from './properties';
import { Neovim } from '../api/Neovim';

export interface PluginWrapperConstructor {
  new (nvim: Neovim): PluginWrapperInterface;
}
export interface PluginWrapperInterface extends PluginWrapperConstructor {
  setApi(nvim: Neovim): void;
}

function wrapper(
  cls: PluginWrapperConstructor,
  options?: { dev?: boolean }
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
export function plugin(outter): Function | PluginWrapperConstructor {
  return typeof outter !== 'function'
    ? cls => wrapper(cls, outter)
    : wrapper(outter);
}
