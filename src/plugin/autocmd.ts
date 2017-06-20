import { NVIM_SYNC, NVIM_SPEC, NVIM_METHOD_NAME } from './properties';

export interface AutocmdOptions {
  pattern: string;
  eval?: string;
  sync?: boolean;
}

// Example
// @autocmd('BufEnter', { pattern: '*.js', eval: 'expand("<afile>")', sync: true })
export function autocmd(name, options: AutocmdOptions) {
  return function(cls, methodName) {
    // const {
    // sync,
    // ...opts,
    // } = options;

    const sync = options && options.sync;
    const f = cls[methodName];
    const opts : AutocmdOptions = {
      pattern: '',
    };

    ['pattern', 'eval'].forEach(option => {
      if (options && typeof options[option] !== 'undefined') {
        opts[option] = options[option];
      }
    });

    const nameWithPattern = `${name}${options.pattern
      ? `:${options.pattern}`
      : ''}`;
    Object.defineProperty(f, NVIM_METHOD_NAME, {
      value: `autocmd:${nameWithPattern}`,
    });
    Object.defineProperty(f, NVIM_SYNC, { value: !!sync });
    Object.defineProperty(f, NVIM_SPEC, {
      value: {
        type: 'autocmd',
        name,
        sync: !!sync,
        opts,
      },
    });
    // eslint-disable-next-line no-param-reassign
    cls[methodName] = f;
    return cls;
  };
}
