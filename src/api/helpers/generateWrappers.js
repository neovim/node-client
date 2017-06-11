const parseFunctionMetadata = require('./parseFunctionMetadata');

const createApiMethod = function({ name, takesCallback }) {
  let newMethod;
  if (takesCallback) {
    newMethod = function(...args) {
      this.logger.debug(`request -> neovim.api.${name}`);
      return new Promise((resolve, reject) => {
        // does args need this?
        this._session.request(name, args, (err, res) => {
          this.logger.debug(`neovim.api.${name}.resp: ${res}`);
          if (err) {
            reject(new Error(`${name}: ${err[1]}`));
          } else {
            resolve(this._decode(res));
          }
        });
      });
    };
  } else {
    newMethod = function(...args) {
      this.logger.debug(`notify -> neovim.api.${name}`);
      this._session.notify(name, args);
    };
  }

  Object.defineProperty(newMethod, 'name', { value: name });
  return newMethod;
};

function generateWrappers(cls, types, prefixMap, metadata) {
  metadata.functions.forEach(func => {
    const {
      name,
      parameters,
      return_type: returnType,
      deprecated_since: deprecatedSince,
      method: isMethod,
    } = func;

    // Don't parse deprecated APIs
    if (deprecatedSince === '1') {
      return;
    }

    const { typeName, methodName } = parseFunctionMetadata({
      prefixMap,
      name,
    });

    const args = parameters.map(param => param[1]);
    const hasReturn = returnType !== 'void';

    // Choose between a ExtType constructor or Neovim class
    const Type = isMethod ? types[typeName].constructor : cls;

    // Generate method
    const method = createApiMethod({ name, takesCallback: hasReturn });

    const methodMetadata = {
      name: methodName,
      returnType,
      parameters: args,
      parameterTypes: parameters.map(p => p[0]),
    };

    // ExtType (i.e. Buffer) methods should be defined in respective class and not on
    // Neovim class, so node client API will does not require the first parameter (which
    // is `this`)
    //
    // ex: for a call like:
    //   nvim_buf_line_count(buffer)
    // our node api will roughly look like:
    //   Buffer.lineCount = () => this.request('nvim_buf_line_count', this)
    if (isMethod) {
      methodMetadata.parameterTypes.shift();
      methodMetadata.parameters.shift();
    }

    // One potential issue is trying to call nvim apis before it has been generated,
    // In that case using a Proxy would be better so can we catch all undefined api calls
    // But this is fine for now
    Type.prototype[methodName] = function(...a) {
      return method.apply(this, a);
    };

    Object.defineProperty(Type.prototype[methodName], 'metadata', {
      value: methodMetadata,
    });

    Object.defineProperty(Type.prototype[methodName], 'name', {
      value: methodName,
    });
  });
}

module.exports = generateWrappers;
module.exports.default = module.exports;
