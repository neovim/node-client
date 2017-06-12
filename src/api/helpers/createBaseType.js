/* eslint no-shadow:0 */
// eslint-disable-next-line func-names
//
const decode = require('../../decode');

module.exports = function(name) {
  const ExtTypeFactory = function({ session, data, logger, metadata }) {
    this._session = session;
    this._data = data;
    this._decode = decode;

    this.logger = logger;
    Object.defineProperty(this, 'metadata', { value: metadata });

    if (metadata && metadata.prefix) {
      Object.defineProperty(this, 'prefix', { value: metadata.prefix });
    }
  };

  ExtTypeFactory.prototype.equals = function equals(other) {
    try {
      return this._data.toString() === other._data.toString();
    } catch (e) {
      return false;
    }
  };

  // TODO: Use this
  ExtTypeFactory.prototype.request = function request(name, args) {
    this.logger.debug(`request -> neovim.api.${name}`);
    return new Promise((resolve, reject) => {
      // does args need this?
      this._session.request(name, args, (err, res) => {
        this.logger.debug(`response -> neovim.api.${name}: ${res}`);
        if (err) {
          reject(new Error(`${name}: ${err[1]}`));
        } else {
          resolve(this._decode(res));
        }
      });
    });
  };

  // TODO: Use this
  ExtTypeFactory.prototype.notify = function notify(name, args) {
    this.logger.debug(`notify -> neovim.api.${name}`);
    this._session.notify(name, args);
  };

  Object.defineProperty(ExtTypeFactory, 'name', { value: name });
  return ExtTypeFactory;
};
