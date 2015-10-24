/* jshint loopfunc: true, evil: true */
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var traverse = require('traverse');
var Session = require('msgpack5rpc');
var _ = require('lodash');
var Promise = require('es6-promise').Promise;

function Nvim(session, channel_id) {
  this._session = session;
  this._decode = decode;
  this._channel_id = channel_id;
}
util.inherits(Nvim, EventEmitter);

function decode(obj) {
  traverse(obj).forEach(function(item) {
    if (Buffer.isBuffer(item)) {
      try { this.update(item.toString('utf8')); } catch (e) {}
    }
  });

  return obj;
}

function generateWrappers(Nvim, types, metadata) {
  for (var i = 0; i < metadata.functions.length; i++) {
    var func = metadata.functions[i];
    var parts = func.name.split('_');
    var typeName = _.capitalize(parts[0]);
    // The type name is the word before the first dash capitalized. If the type
    // is Vim, then it a editor-global method which will be attached to the Nvim
    // class.
    var methodName = _.camelCase(parts.slice(1).join(('_')));
    var args = _.map(func.parameters, function(param) {
      return param[1];
    });
    var Type, callArgs;
    if (typeName === 'Vim') {
      Type = Nvim;
      callArgs = args.join(', ');
    } else {
      Type = types[typeName];
      args = args.slice(1);
      // This is a method of one of the ext types, prepend "this" to the call
      // arguments.
      callArgs = ['_this'].concat(args).join(', ');
    }
    var params = args.join(', ');
    var method = new Function(
      'return function ' + methodName + '(' + params + ') {' +
      '\n  var _this = this;' +
      '\n  return new Promise(function(resolve, reject){' +
      '\n    _this._session.request("' + func.name + '", [' + callArgs + '], function(err, res) {' +
      '\n     if (err) return reject(new Error(err[1]));' +
      '\n     resolve(_this._decode(res));' +
      '\n   });' +
      '\n  });' +
      '\n};'
    )();
    method.metadata = {
      name: methodName,
      deferred: func.deferred,
      returnType: func.return_type,
      parameters: args,
      parameterTypes: func.parameters.map(function(p) { return p[0]; }),
      canFail: func.can_fail,
    }
    if (typeName !== 'Vim') {
      method.metadata.parameterTypes.shift();
    }
    Type.prototype[methodName] = method;
  }
}

function addExtraNvimMethods(Nvim) {
  Nvim.prototype.uiAttach = function uiAttach(width, height, rgb, cb) {
    if (cb) {
      this._session.request('ui_attach', [width, height, rgb], cb);
    } else {
      this._session.notify('ui_attach', [width, height, rgb]);
    }
  };

  Nvim.prototype.uiDetach = function uiDetach(cb) {
    if (cb) {
      this._session.request('ui_detach', [], cb);
    } else {
      this._session.notify('ui_detach', []);
    }
  };

  Nvim.prototype.uiTryResize = function uiTryResize(width, height, cb) {
    if (cb) {
      this._session.request('ui_try_resize', [width, height], cb);
    } else {
      this._session.notify('ui_try_resize', [width, height]);
    }
  };

  Nvim.prototype.quit = function quit() {
    this.command('qa!', []);
  };
}

// Note: Use callback because it may be called more than once.
module.exports.attach = function(writer, reader, cb) {
  var session = new Session([]);
  var initSession = session;
  var nvim = new Nvim(session)
  var pendingRPCs = [];
  var calledCallback = false;

  session.attach(writer, reader);

  var _this = this;
  return new Promise(function(resolve, reject){
    // register initial RPC handlers to queue non-specs requests until api is generated
    session.on('request', function(method, args, resp) {
      if (method !== 'specs') {
        pendingRPCs.push({ type: 'request', args: [].slice.call(arguments) });
      } else {
        resolve(nvim); // the errback may be called later, but 'specs' must be handled
        calledCallback = true;
        nvim.emit('request', decode(method), decode(args), resp);
      }
    });

    session.on('notification', function(method, args) {
      pendingRPCs.push({ type: 'notification', args: [].slice.call( arguments ) });
    });

    session.on('detach', function() {
      session.removeAllListeners('request');
      session.removeAllListeners('notification');
      nvim.emit('disconnect');
    });

    session.request('vim_get_api_info', [], function(err, res) {
      if (err) {
        return reject(err);
      }

      var channel_id = res[0];

      var metadata = decode(res[1]);
      var extTypes = [];
      var types = {};

      Object.keys(metadata.types).forEach(function(name) {
        // Generate a constructor function for each type in metadata.types
        var Type = new Function(
          'return function ' + name + '(session, data, decode) { ' +
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
          decode: function(data) { return new Type(session, data, decode); },
          encode: function(obj) { return obj._data; }
        });

        types[name] = Type;
        Nvim.prototype[name] = Type;
      });

      generateWrappers(Nvim, types, metadata);
      addExtraNvimMethods(Nvim);
      session = new Session(extTypes);
      session.attach(writer, reader);

      nvim = new Nvim(session, channel_id);

      // register the non-queueing handlers
      session.on('request', function(method, args, resp) {
        nvim.emit('request', decode(method), decode(args), resp);
      });

      session.on('notification', function(method, args) {
        nvim.emit('notification', decode(method), decode(args));
      });

      session.on('detach', function() {
        session.removeAllListeners('request');
        session.removeAllListeners('notification');
        nvim.emit('disconnect');
      });

      resolve(nvim);

      // dequeue any pending RPCs
      pendingRPCs.forEach( function(pending) {
        nvim.emit.apply(nvim, [].concat( pending.type, pending.args ));
      })
      initSession.detach();
    });
  });
};
