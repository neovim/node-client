var _dec, _dec2, _dec3, _dec4, _class, _desc, _value, _class2;

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
required = require('./fixture');
// console.log('ahh, silence')

const {
  Plugin,
  Function,
  Autocmd,
  Command
} = require('../../../../../../lib/plugin');

let Test = (_dec = Plugin(), _dec2 = Command('JSHostTestCmd', { sync: true, range: '', nargs: '*' }), _dec3 = Autocmd('BufEnter', {
  sync: true,
  pattern: '*.test',
  eval: 'expand("<afile>")'
}), _dec4 = Function('Func', { sync: true }), _dec(_class = (_class2 = class Test {
  constructor() {}

  hostTest(args, range) {
    if (args[0] === 'canhazresponse?') {
      throw new Error('no >:(');
    }

    this.nvim.setCurrentLine('A line, for your troubles');

    return true;
  }

  onBufEnter(filename) {
    return new Promise((resolve, reject) => {
      console.log('This is an annoying function ' + filename);
      resolve(filename);
    });
  }

  func(args) {
    return 'Funcy ' + args;
  }
}, (_applyDecoratedDescriptor(_class2.prototype, 'hostTest', [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, 'hostTest'), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, 'onBufEnter', [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, 'onBufEnter'), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, 'func', [_dec4], Object.getOwnPropertyDescriptor(_class2.prototype, 'func'), _class2.prototype)), _class2)) || _class);


module.exports = Test;
module.exports.default = module.exports;