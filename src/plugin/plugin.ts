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
// function wrapper(
//   cls: PluginWrapperConstructor,
//   options?: PluginDecoratorOptions
// ): PluginWrapperConstructor {
//   class WrapperClass extends cls implements PluginWrapperInterface {
//     public nvim: Neovim;
//     constructor(nvim: Neovim) {
//       super(nvim);
//       this.setApi(nvim);
//     }
//     setApi(nvim: Neovim) {
//       this.nvim = nvim;
//     }
//   }
//   Object.defineProperty(WrapperClass, NVIM_PLUGIN, { value: true });
//
//   if (options && options.dev) {
//     Object.defineProperty(WrapperClass, NVIM_DEV_MODE, { value: true });
//   }
//   return WrapperClass;
// }

// Can decorate a class with options object
export function plugin(pluginOptions?: PluginDecoratorOptions): ClassDecorator {
  return (targetClass: PluginWrapperConstructor) => {
    // return new constructor (will override original)
    class Wrapper extends targetClass implements PluginWrapperInterface {
      public nvim: Neovim;
      constructor(nvim: Neovim) {
        super(nvim);
        this.setApi(nvim);
      }
      setApi(nvim) {
        this.nvim = nvim;
      }
    }
    Object.defineProperty(Wrapper, NVIM_PLUGIN, { value: true });
    if (pluginOptions && pluginOptions.dev) {
      Object.defineProperty(Wrapper, NVIM_DEV_MODE, { value: true });
    }
    return Wrapper;
  };
  // return typeof outter !== 'function'
  //   ? cls => wrapper(cls, outter)
  //   : wrapper(outter);
}
