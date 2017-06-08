/* jshint loopfunc: true, evil: true */
const util = require('util');
const EventEmitter = require('events').EventEmitter;

const traverse = require('traverse');
const Session = require('msgpack5rpc');
const _ = require('lodash');
const logger = require('./src/logger');

function decode(obj) {
  traverse(obj).forEach(function (item) {
    if (item instanceof Session) {
      this.update(item, true);
    } else if (Buffer.isBuffer(item)) {
      try {
        this.update(item.toString('utf8'));
        // eslint-disable-next-line
      } catch (e) {}
    }
  });

  return obj;
}

function Nvim(session, channelId) {
  this._session = session;
  this._decode = decode;
  this._channel_id = channelId;
  this.logger = logger;
}
util.inherits(Nvim, EventEmitter);

function generateWrappers(nvim, types, metadata) {
  metadata.functions.forEach(func => {
    console.log(func, func.parameters);
    const parts = func.name.split('_');
    const typeName = _.capitalize(parts[0]);
    // The type name is the word before the first dash capitalized. If the type
    // is Vim, then it a editor-global method which will be attached to the Nvim
    // class.
    const methodName = _.camelCase(parts.slice(typeName !== 'Ui').join('_'));
    const args = func.parameters.map(param => param[1]);
    logger.info(func);
    let Type;
    let callArgs;
    const hasReturn = func.return_type !== 'void';

    if (typeName === 'Nvim' || typeName === 'Vim' || typeName === 'Ui') {
      Type = nvim;
      callArgs = args.join(', ');
    } else {
      Type = types[typeName];
      // args = args.slice(1);
      // This is a method of one of the ext types, prepend "this" to the call
      // arguments.
      callArgs = ['this'].concat(args).join(', ');
    }

    const params = args.join(', ');

    // eslint-disable-next-line no-new-func
    const method = new Function(
      `return function ${methodName}(${params}) {
          this.logger.debug('neovim.api.${func.name}(${params})');
          return new Promise((resolve, reject) => {
            // Currently doesnt do this obviously
            if (${hasReturn}) {
              this._session.notify("${func.name}", [${callArgs}]);
              resolve();
              return;
            }

            this._session.request("${func.name}", [${callArgs}], (err, res) => {
              this.logger.debug('neovim.api.${func.name}.resp: ' + res);
               if (err) { reject(new Error(err[1])); }
               else { resolve(this._decode(res)) }
            });
          });
      };`
    )();

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

    Type.prototype[methodName] = method;
  });
}

function addExtraNvimMethods(nvim) {
  // eslint-disable-next-line no-param-reassign
  nvim.prototype.quit = function quit() {
    this.command('qa!', []);
  };
}

function attach(writer, reader, cb) {
  let session = new Session([]);
  const initSession = session;
  let nvim = new Nvim(session);
  const pendingRPCs = [];
  // let calledCallback = false;

  session.attach(writer, reader);

  // register initial RPC handlers to queue non-specs requests until api is generated
  session.on('request', (method, args, resp, ...restArgs) => {
    logger.info('old reqest', method);
    if (method !== 'specs') {
      pendingRPCs.push({
        type: 'request',
        args: [method, args, resp, ...restArgs],
      });
    } else {
      cb(null, nvim); // the errback may be called later, but 'specs' must be handled
      // calledCallback = true;
      nvim.emit('request', decode(method), decode(args), resp);
    }
  });

  session.on('notification', (method, ...restArgs) => {
    pendingRPCs.push({
      type: 'notification',
      args: [method, ...restArgs],
    });
  });

  session.on('detach', () => {
    session.removeAllListeners('request');
    session.removeAllListeners('notification');
    nvim.emit('disconnect');
  });

  session.request('vim_get_api_info', [], (err, res) => {
    if (err) {
      cb(err);
    } else {
      const [
        channelId,
        encodedMetadata,
      ] = res;
      const metadata = decode(encodedMetadata);
      const extTypes = [];
      const types = {};

      Object.keys(metadata.types).forEach(name => {
        // Generate a constructor function for each type in metadata.types
        // eslint-disable-next-line no-new-func
        const Type = new Function(
          `return function ${name}(session, data, decode, logger) { ` +
          '\n  this.logger = logger;' +
          '\n  this._session = session;' +
          '\n  this._data = data;' +
          '\n  this._decode = decode;' +
          '\n};'
        )();

        Type.prototype.equals = function equals(other) {
          try {
            return this._data.toString() === other._data.toString();
          } catch (e) {
            return false;
          }
        };

        // Collect the type information necessary for msgpack5 deserialization
        // when it encounters the corresponding ext code.
        extTypes.push({
          constructor: Type,
          code: metadata.types[name].id,
          decode(data) {
            return new Type(session, data, decode, logger);
          },
          encode(obj) {
            return obj._data;
          },
        });

        types[name] = Type;
        Nvim.prototype[name] = Type;
      });

      generateWrappers(Nvim, types, metadata);
      addExtraNvimMethods(Nvim);
      session = new Session(extTypes);
      session.attach(writer, reader);

      nvim = new Nvim(session, channelId);

      // register the non-queueing handlers
      session.on('request', (method, args, resp) => {
        logger.info('new request', method);
        nvim.emit('request', decode(method), decode(args), resp);
      });

      session.on('notification', (method, args) => {
        nvim.emit('notification', decode(method), decode(args));
      });

      session.on('detach', () => {
        session.removeAllListeners('request');
        session.removeAllListeners('notification');
        nvim.emit('disconnect');
      });

      cb(null, nvim);

      // dequeue any pending RPCs
      initSession.detach();
      pendingRPCs.forEach(pending => {
        if (pending.type === 'request') {
          // there's no clean way to change the output channel using the current
          // Session abstraction
          pending.args[pending.args.length - 1]._encoder = session._encoder;
        }
        nvim.emit(...[].concat(pending.type, pending.args));
      });
    }
  });
}

// 'default' export for ES2015 or TypeScript environment.
module.exports = attach;
module.exports.default = module.exports;
