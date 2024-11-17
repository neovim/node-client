loaded = [] instanceof Array;
required = require('./fixture');

// Hack to get global object
const global = Function('return this')();

const { Plugin, Function: NvimFunction, Autocmd, Command } = require('@neovim/decorators');

@Plugin
class Test {
  @Command('JSHostTestCmd', { sync: true, range: '', nargs: '*' })
  hostTest(args, range) {
    if (args[0] === 'canhazresponse?') {
      throw new Error('no >:(');
    }

    this.nvim.setLine('A line, for your troubles');

    return true;
  }

  @Autocmd('BufEnter', {
    sync: true,
    pattern: '*.test',
    eval: 'expand("<afile>")',
  })
  onBufEnter(filename) {
    return new Promise((resolve, reject) => {
      console.log('This is an annoying function ' + filename);
      resolve(filename);
    });
  }

  @NvimFunction('Func', { sync: true })
  func(args) {
    return 'Funcy ' + args;
  }

  @NvimFunction('Global', { sync: true })
  getGlobal(name) {
    return global[name];
  }

  @NvimFunction('Illegal', { sync: true })
  illegalProcessCall() {
    process.chdir();
  }

  @NvimFunction('Umask', { sync: true })
  umask(arg) {
    return process.umask(arg);
  }
}

module.exports = Test;
module.exports.default = module.exports;
