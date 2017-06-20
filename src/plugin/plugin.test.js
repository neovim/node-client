/* eslint-env jest */
const Plugin = require('./plugin');
const FunctionDecorator = require('./function');
const Command = require('./command');
const Autocmd = require('./autocmd');
const {
  NVIM_PLUGIN,
  NVIM_DEV_MODE,
  NVIM_METHOD_NAME,
} = require('./properties');

describe('Plugin class decorator', () => {
  it('decorates class with no options', () => {
    class MyClass {}

    const NewClass = Plugin(MyClass);

    expect(NewClass[NVIM_PLUGIN]).toBe(true);
  });

  it('decorates class with dev mode option', () => {
    class MyClass {}

    const NewClass = Plugin({ dev: true })(MyClass);

    expect(NewClass[NVIM_PLUGIN]).toBe(true);
    expect(NewClass[NVIM_DEV_MODE]).toBe(true);
  });

  it('decorates class methods', () => {
    class MyClass {}
    MyClass.prototype.testF = FunctionDecorator('TestF')(() => {});
    MyClass.prototype.testC = Command('TestCommand')(() => {});
    MyClass.prototype.testA = Autocmd('TestAutocmd', {
      pattern: '*.js',
    })(() => {});

    expect(MyClass.prototype.testF[NVIM_METHOD_NAME]).toBe('function:TestF');
    expect(MyClass.prototype.testC[NVIM_METHOD_NAME]).toBe(
      'command:TestCommand'
    );
    expect(MyClass.prototype.testA[NVIM_METHOD_NAME]).toBe(
      'autocmd:TestAutocmd:*.js'
    );
  });
});
