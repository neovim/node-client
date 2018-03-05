/* eslint-env jest */
import { plugin as Plugin } from './plugin';
import { nvimFunction as FunctionDecorator } from './function';
import { command as Command } from './command';
import { autocmd as Autocmd } from './autocmd';
import { NVIM_PLUGIN, NVIM_DEV_MODE, NVIM_METHOD_NAME } from './properties';

describe('Plugin class decorator', () => {
  it('decorates class with no options', () => {
    class MyClass {}

    const NewClass = Plugin(MyClass);

    expect(NewClass[NVIM_PLUGIN]).toBe(true);
  });

  it('decorates class when using TypeScript decorators', () => {
	  @Plugin({})
	  class MyClass {
		  constructor(nvim) {
		  }
	  }

	  expect(MyClass[NVIM_PLUGIN]).toBe(true);
  });

  it('decorates class with dev mode option', () => {
    class MyClass {}

    const NewClass = Plugin({ dev: true })(MyClass);

    expect(NewClass[NVIM_PLUGIN]).toBe(true);
    expect(NewClass[NVIM_DEV_MODE]).toBe(true);
  });

  it('decorates class methods', () => {
    class MyClass {}
    MyClass.prototype.testF = () => {};
    MyClass.prototype.testC = () => {};
    MyClass.prototype.testA = () => {};

    // This is how (closeish) babel applies decorators
    FunctionDecorator('TestF')(MyClass.prototype, 'testF');
    Command('TestCommand')(MyClass.prototype, 'testC');
    Autocmd('TestAutocmd', {
      pattern: '*.js',
    })(MyClass.prototype, 'testA');

    expect(MyClass.prototype.testF[NVIM_METHOD_NAME]).toBe('function:TestF');
    expect(MyClass.prototype.testC[NVIM_METHOD_NAME]).toBe(
      'command:TestCommand'
    );
    expect(MyClass.prototype.testA[NVIM_METHOD_NAME]).toBe(
      'autocmd:TestAutocmd:*.js'
    );
  });

  it('initializes Plugin class with nvim API', () => {
    const nvim = {};
    class MyClass {}
    const NewClass = Plugin(MyClass);
    const instance = new NewClass(nvim);
    expect(instance.nvim).toBe(nvim);

    const nvim2 = {};
    instance.setApi(nvim2);
    expect(instance.nvim).toBe(nvim2);
  });
});
