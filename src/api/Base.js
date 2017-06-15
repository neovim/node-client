const EventEmitter = require('events').EventEmitter;

const loggerModule = require('../logger');
const decode = require('../decode');

// Instead of dealing with multiple inheritance (or lackof), just extend EE
// Only the Neovim API class should use EE though
class BaseApi extends EventEmitter {
  constructor({ session, data, logger, metadata }) {
    super();

    this._session = session;
    this._data = data;
    this._decode = decode;

    this.logger = logger || loggerModule;

    if (metadata) {
      Object.defineProperty(this, 'metadata', { value: metadata });
      if (metadata.prefix) {
        Object.defineProperty(this, 'prefix', { value: metadata.prefix });
      }
    }
  }

  equals(other) {
    try {
      return this._data.toString() === other._data.toString();
    } catch (e) {
      return false;
    }
  }

  // TODO: Use this
  request(name, args = []) {
    this.logger.debug(`request -> neovim.api.${name}`);
    return new Promise((resolve, reject) => {
      // does args need this?
      this._session.request(name, args, (err, res) => {
        this.logger.debug(`response -> neovim.api.${name}: ${res}`);
        if (err) {
          reject(new Error(`${name}: ${err[1]}`));
        } else {
          resolve(res);
        }
      });
    });
  }

  // TODO: Use this
  notify(name, args) {
    this.logger.debug(`notify -> neovim.api.${name}`);
    this._session.notify(name, args);
  }
}

module.exports = BaseApi;
module.exports.default = module.exports;
