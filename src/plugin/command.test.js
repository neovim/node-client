/* eslint-env jest */
const Command = require('./command');
const { NVIM_SYNC, NVIM_SPEC, NVIM_METHOD_NAME } = require('./properties');

describe('Function decorator', () => {
  it('decorates with "sync" option', () => {
    const testFunc = () => {};
    const newFunc = Command('MyFunction', {
      sync: true,
      range: '*',
      nargs: 'nargs',
    })(testFunc);

    expect(newFunc[NVIM_METHOD_NAME]).toBe('command:MyFunction');
    expect(newFunc[NVIM_SYNC]).toBe(true);
    expect(newFunc[NVIM_SPEC]).toEqual({
      type: 'command',
      name: 'MyFunction',
      sync: true,
      opts: {
        range: '*',
        nargs: 'nargs',
      },
    });
  });
});
