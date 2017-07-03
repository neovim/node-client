import { NVIM_SYNC, NVIM_SPEC, NVIM_METHOD_NAME } from './properties';

export interface NvimFunctionOptions {
  sync?: boolean;
  range?: [number, number];
  eval?: string;
}

export function nvimFunction(name: string, options: NvimFunctionOptions = {}) {
  return function(cls: any, methodName: string | null) {
    // const {
    // sync,
    // ...opts,
    // } = options;
    const sync = options && !!options.sync;
    const isMethod = typeof methodName === 'string';
    const f = isMethod ? cls[methodName] : cls;
    const opts: NvimFunctionOptions = {};

    if (options && options.range) {
      opts.range = options.range;
    }
    if (options && options.eval) {
      opts.eval = options.eval;
    }

    Object.defineProperty(f, NVIM_METHOD_NAME, { value: `function:${name}` });
    Object.defineProperty(f, NVIM_SYNC, { value: !!sync });
    Object.defineProperty(f, NVIM_SPEC, {
      value: {
        type: 'function',
        name,
        sync: !!sync,
        opts,
      },
    });

    if (isMethod) {
      // eslint-disable-next-line no-param-reassign
      cls[methodName] = f;
    }

    return cls;
  };
}
