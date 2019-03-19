loaded = [] instanceof Array;
required = require('./fixture');

// Hack to get global object
const global = Function('return this')();

module.exports = plugin => {
  const nvim = plugin.nvim;

  function hostTest(args, range) {
    if (args[0] === 'canhazresponse?') {
      throw new Error('no >:(');
    }

    nvim.setLine('A line, for your troubles');

    return true;
  }

  function onBufEnter(filename) {
    return new Promise((resolve, reject) => {
      console.log('This is an annoying function ' + filename);
      resolve(filename);
    });
  }

  function func(args) {
    return 'Funcy ' + args;
  }

  function getGlobal(name) {
    return global[name];
  }

  plugin.registerCommand('JSHostTestCmd', hostTest, {
    sync: true,
    range: '',
    nargs: '*',
  });
  plugin.registerAutocmd('BufEnter', onBufEnter, {
    sync: true,
    pattern: '*.test',
    eval: 'expand("<afile>")',
  });
  plugin.registerFunction('Func', func, { sync: true });
  plugin.registerFunction('Global', getGlobal, { sync: true });
};

module.exports.default = module.exports;
