loaded = [] instanceof Array;
// globals = global
required = require('./fixture');
// console.log('ahh, silence')

const {
  Plugin,
  Function,
  Autocmd,
  Command,
} = require('../../../../../../plugin');

@Plugin
class Test {
  @Command('JSHostTestCmd', { sync: true, range: '', nargs: '*' })
  hostTest(args, range) {
    if (args[0] === 'canhazresponse?') {
      throw new Error('no >:(');
    }

    this.nvim.setCurrentLine('A line, for your troubles');

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

  @Function('Func', { sync: true })
  func(args) {
    return 'Funcy ' + args;
  }
}

module.exports = Test;
module.exports.default = module.exports;
