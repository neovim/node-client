const { NVIM_SYNC, NVIM_SPEC, NVIM_METHOD_NAME } = require('./properties');

module.exports = function(name, options = {}) {
  return function(cls, methodName) {
    // const {
    // sync,
    // ...opts,
    // } = options;
    const sync = options.sync;
    const f = cls[methodName];
    const opts = {};

    if (options.range) {
      opts.range = options.range;
    }
    if (options.eval) {
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
    // eslint-disable-next-line no-param-reassign
    cls[methodName] = f;
    return cls;
  };
};
