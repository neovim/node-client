// eslint-disable-next-line func-names
module.exports = function(name) {
  const newFunction = function(session, data, decode, logger) {
    this.logger = logger;
    this._session = session;
    this._data = data;
    this._decode = decode;
  };
  newFunction.prototype.equals = function equals(other) {
    try {
      return this._data.toString() === other._data.toString();
    } catch (e) {
      return false;
    }
  };

  Object.defineProperty(newFunction, 'name', { value: name });

  return newFunction;
};
