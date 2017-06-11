const inspect = require('util').inspect;

const _ = require('lodash');
const logger = require('../logger');

const createApiMethod = function(name, takesCallback) {
  let newMethod;
  if (takesCallback) {
    newMethod = function(...args) {
      this.logger.debug(`neovim.api.${name}`);
      return new Promise((resolve, reject) => {
        // does args need this?
        this._session.request(name, args, (err, res) => {
          this.logger.debug(`neovim.api.${name}.resp: ${res}`);
          if (err) {
            reject(new Error(err[1]));
          } else {
            resolve(this._decode(res));
          }
        });
      });
    };
  } else {
    newMethod = function(...args) {
      this.logger.debug(`neovim.api.${name}`);
      this._session.notify(name, args);
    };
  }

  Object.defineProperty(newMethod, 'name', { value: name });
  return newMethod;
};

function generateWrappers(cls, types, metadata) {
  metadata.functions.forEach(func => {
    // console.log(func, func.parameters);
    const parts = func.name.split('_');
    const typeName = _.capitalize(parts[0]);
    // The type name is the word before the first dash capitalized. If the type
    // is Vim, then it a editor-global method which will be attached to the Nvim
    // class.
    const methodName = _.camelCase(parts.slice(typeName !== 'Ui').join('_'));
    const args = func.parameters.map(param => param[1]);
    logger.info(func);
    let Type;
    // let callArgs;
    const hasReturn = func.return_type !== 'void';

    if (typeName === 'Nvim' || typeName === 'Vim' || typeName === 'Ui') {
      Type = cls;
      // callArgs = args.join(', ');
    } else {
      Type = types[typeName];
      // args = args.slice(1);
      // This is a method of one of the ext types, prepend "this" to the call
      // arguments.
      // callArgs = ['this'].concat(args).join(', ');
    }

    // const params = args.join(', ');

    const method = createApiMethod(func.name, hasReturn);

    // eslint-disable-next-line no-new-func
    // const method = new Function(
    // `return function ${methodName}(${params}) {
    // this.logger.debug('neovim.api.${func.name}(${params})');
    // return new Promise((resolve, reject) => {
    // // Currently doesnt do this obviously
    // if (${hasReturn}) {
    // this._session.notify("${func.name}", [${callArgs}]);
    // resolve();
    // return;
    // }

    // this._session.request("${func.name}", [${callArgs}], (err, res) => {
    // this.logger.debug('neovim.api.${func.name}.resp: ' + res);
    // if (err) { reject(new Error(err[1])); }
    // else { resolve(this._decode(res)) }
    // });
    // });
    // };`
    // )();

    method.metadata = {
      name: methodName,
      deferred: func.deferred,
      returnType: func.return_type,
      parameters: args,
      parameterTypes: func.parameters.map(p => p[0]),
      canFail: func.can_fail,
    };

    if (typeName === 'Nvim') {
      // method.metadata.parameterTypes.shift();
    }

    Type.prototype[methodName] = function(...a) {
      return method.apply(this, a);
    };
    Type.prototype[methodName].name = methodName;
  });
}

module.exports = generateWrappers;
module.exports.default = module.exports;
