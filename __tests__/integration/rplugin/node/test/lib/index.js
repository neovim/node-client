var _dec, _dec2, _dec3, _class, _desc, _value, _class2;

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object['ke' + 'ys'](descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object['define' + 'Property'](target, property, desc);
    desc = null;
  }

  return desc;
}

loaded = [] instanceof Array;
// globals = global
required = require('./fixture'
// console.log('ahh, silence')

);const {
  Plugin,
  Function,
  Autocmd,
  Command
} = require('neovim2/plugin');

let Test = (_dec = Command('JSHostTestCmd', { sync: true, range: '', nargs: '*' }), _dec2 = Autocmd('BufEnter', { sync: true, pattern: '*.js', eval: 'expand("<afile>")' }), _dec3 = Function('Func'), Plugin(_class = (_class2 = class Test {
  hostTest(args, range, cb) {
    this.nvim.setCurrentLine('A line, for your troubles');
    if (args[0] === 'canhazresponse?') {
      cb(new Error('no >:('));
    }
    cb();
  }

  onBufEnter(filename, cb) {
    debug('This is an annoying function');
    cb();
  }

  func(args) {
    return 'Funcy ' + args;
  }
}, (_applyDecoratedDescriptor(_class2.prototype, 'hostTest', [_dec], Object.getOwnPropertyDescriptor(_class2.prototype, 'hostTest'), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, 'onBufEnter', [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, 'onBufEnter'), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, 'func', [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, 'func'), _class2.prototype)), _class2)) || _class);


module.exports = Test;
module.exports.default = module.exports;