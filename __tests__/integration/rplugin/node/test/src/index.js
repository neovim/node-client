loaded = [] instanceof Array
// globals = global
required = require('./fixture')
// console.log('ahh, silence')

const {
  Plugin,
  Function,
  Autocmd,
  Command,
} = require('neovim2/plugin');

@Plugin
class Test {
  @Command('JSHostTestCmd', { sync: true, range: '', nargs: '*' })
  hostTest(args, range, cb) {
    this.nvim.setCurrentLine('A line, for your troubles')
    if (args[0] === 'canhazresponse?') {
        cb(new Error('no >:('))
    }
    cb()
  }

  @Autocmd('BufEnter', { sync: true, pattern: '*.js', eval: 'expand("<afile>")' })
  onBufEnter(filename, cb) {
    debug('This is an annoying function')
    cb()
  }

  @Function('Func')
  func(args) {
    return 'Funcy ' + args
  }
}

module.exports = Test;
module.exports.default = module.exports;
