const { NVIM_SYNC, NVIM_SPEC, NVIM_METHOD_NAME } = require('./properties');

// Example
// @command('BufEnter', { range: '', nargs: '*' })
module.exports = function(name, options = {}) {
  return function(cls, methodName) {
    // const {
    // sync,
    // ...opts,
    // } = options;

    const f = cls[methodName];
    const opts = {};
    const sync = false;

    ['range', 'nargs'].forEach(option => {
      if (typeof options[option] !== 'undefined') {
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
    // eslint-disable-next-line no-param-reassign
    cls[methodName] = f;
    return cls;
  };
};
