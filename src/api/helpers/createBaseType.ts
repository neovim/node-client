/* eslint no-shadow:0 */
// eslint-disable-next-line func-names
import { BaseApi } from '../Base';
// import logger from '../../logger';

export function createBaseType(name) {
  // Should avoid using this, instead create a static API wrapper
  //  logger.warn(`Creating a dynamic API class for type ${name}`);
  const ExtType = Object.create(new BaseApi());
  Object.defineProperty(ExtType, 'name', { value: name });
  return ExtType;
};
