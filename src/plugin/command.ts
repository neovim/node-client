import { NVIM_SYNC, NVIM_SPEC, NVIM_METHOD_NAME } from './properties';

export interface CommandOptions {
  sync?: boolean;
  range?: string;
  nargs?: string;
}

// Example
// @command('BufEnter', { range: '', nargs: '*' })
export function command(name: string, options?: CommandOptions) {
  return function(cls, methodName) {
    // const {
    // sync,
    // ...opts,
    // } = options;

    const sync = options && !!options.sync;
    const isMethod = typeof methodName === 'string';
    const f = isMethod ? cls[methodName] : cls;
    const opts: CommandOptions = {};

    ['range', 'nargs'].forEach(option => {
      if (options && typeof options[option] !== 'undefined') {
        opts[option] = options[option];
      }
    });

    Object.defineProperty(f, NVIM_METHOD_NAME, { value: `command:${name}` });
    Object.defineProperty(f, NVIM_SYNC, { value: !!sync });
    Object.defineProperty(f, NVIM_SPEC, {
      value: {
        type: 'command',
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
