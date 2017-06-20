/* eslint-env jest */
const FunctionDecorator = require('./function');
const { NVIM_SYNC, NVIM_SPEC, NVIM_METHOD_NAME } = require('./properties');

describe('Function decorator', () => {
  it('decorates with "sync" option', () => {
    const testFunc = () => {};
    const newFunc = FunctionDecorator('MyFunction', {
      sync: true,
      range: '*',
      eval: '<afile>',
    })(testFunc);

    expect(newFunc[NVIM_METHOD_NAME]).toBe('function:MyFunction');
    expect(newFunc[NVIM_SYNC]).toBe(true);
    expect(newFunc[NVIM_SPEC]).toEqual({
      type: 'function',
      name: 'MyFunction',
      sync: true,
      opts: {
        range: '*',
        eval: '<afile>',
      },
    });
  });
});
