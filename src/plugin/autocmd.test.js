/* eslint-env jest */
const Autocmd = require('./autocmd');
const { NVIM_SYNC, NVIM_SPEC, NVIM_METHOD_NAME } = require('./properties');

describe('Autocmd decorator', () => {
  it('decorates with "sync" and "pattern" options', () => {
    const testFunc = () => {};
    const newFunc = Autocmd('MyFunction', {
      sync: true,
      pattern: '*.js',
      eval: '<afile>',
    })(testFunc);

    expect(newFunc[NVIM_METHOD_NAME]).toBe('autocmd:MyFunction:*.js');
    expect(newFunc[NVIM_SYNC]).toBe(true);
    expect(newFunc[NVIM_SPEC]).toEqual({
      type: 'autocmd',
      name: 'MyFunction',
      sync: true,
      opts: {
        pattern: '*.js',
        eval: '<afile>',
      },
    });
  });

  it('decorates empty "pattern" option', () => {
    const testFunc = () => {};
    const newFunc = Autocmd('MyFunction', {
      pattern: '',
    })(testFunc);

    expect(newFunc[NVIM_METHOD_NAME]).toBe('autocmd:MyFunction');
    expect(newFunc[NVIM_SYNC]).toBe(false);
    expect(newFunc[NVIM_SPEC]).toEqual({
      type: 'autocmd',
      name: 'MyFunction',
      sync: false,
      opts: {
        pattern: '',
      },
    });
  });
});
