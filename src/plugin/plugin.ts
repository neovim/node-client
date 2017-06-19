// Plugin decorator

import { NVIM_PLUGIN, NVIM_DEV_MODE } from './properties';

function wrapper(cls, options={}) {
  class WrapperClass extends cls {
    constructor(nvim) {
      super(nvim);
      this.setApi(nvim);
    }

    setApi(nvim) {
      this.nvim = nvim;
    }
  }
  Object.defineProperty(WrapperClass, NVIM_PLUGIN, { value: true });

  if (options.dev) {
    Object.defineProperty(WrapperClass, NVIM_DEV_MODE, { value: true });
  }
  return WrapperClass;
}

// Can decorate a class with options object
export function plugin(outter) {
  return typeof outter !== 'function'
    ? cls => wrapper(cls, outter)
    : wrapper(outter);
};
