const { NVIM_SYNC, NVIM_SPEC, NVIM_METHOD_NAME } = require('./properties');

// Example
// @autocmd('BufEnter', { pattern: '*.js', eval: 'expand("<afile>")', sync: true })
module.exports = function(name, options = {}) {
  return function(cls, methodName) {
    // const {
    // sync,
    // ...opts,
    // } = options;

    const sync = options.sync;
    const f = cls[methodName];
    const opts = {};

    ['pattern', 'eval'].forEach(option => {
      if (typeof options[option] !== 'undefined') {
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
};
