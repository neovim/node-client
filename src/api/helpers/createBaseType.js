/* eslint no-shadow:0 */
// eslint-disable-next-line func-names
const BaseApi = require('../Base');
const logger = require('../../logger');

module.exports = function(name) {
  // Should avoid using this, instead create a static API wrapper
  logger.warn(`Creating a dynamic API class for type ${name}`);
  const ExtType = Object.create(new BaseApi());
  Object.defineProperty(ExtType, 'name', { value: name });
  return ExtType;
};
