/* eslint-env jest */
import { DevNull } from './devnull';

describe('DevNull', () => {
  it('should be webscale', done => {
    const devnull = new DevNull({});
    expect(devnull.read()).toEqual(null);
    expect(devnull.write('test', done)).toEqual(true);
  });
});
