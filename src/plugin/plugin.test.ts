/* eslint-env jest */
import { plugin as Plugin } from './plugin';
import { NvimPlugin } from '../host/NvimPlugin';
import { nvimFunction as FunctionDecorator } from './function';
import { command as Command } from './command';
import { autocmd as Autocmd } from './autocmd';
import { NVIM_PLUGIN, NVIM_DEV_MODE, NVIM_METHOD_NAME } from './properties';

const instantiateOrRun = (fn, ...args) => {
  try {
    return new fn(...args);
  } catch (err) {
    if (err instanceof TypeError) {
      return fn(...args);
    } else {
      throw err;
    }
  }
};

describe('Plugin class decorator', () => {
  it('decorates class with no options', () => {
    class MyClass {}
    const plugin = Plugin(MyClass);
    expect(typeof plugin).toEqual('function');
  });

  it('decorates class with dev mode option', () => {
    class MyClass {}

    const plugin = Plugin({ dev: true })(MyClass);
    expect(typeof plugin).toEqual('function');

    const pluginObject = { setOptions: jest.fn() };
    instantiateOrRun(plugin, pluginObject);
    expect(pluginObject.setOptions).toHaveBeenCalledWith({ dev: true });
  });

  it('decorates class methods', () => {
    class MyClass {}
    MyClass.prototype.testF = () => {};
    MyClass.prototype.testC = () => {};
    MyClass.prototype.testA = () => {};

    // This is how (closeish) babel applies decorators
    FunctionDecorator('TestF', { eval: 'test', range: 'test' })(
      MyClass.prototype,
      'testF'
    );
    Command('TestCommand', { range: 'test', nargs: '3' })(
      MyClass.prototype,
      'testC'
    );
    Autocmd('TestAutocmd', {
      pattern: '*.js',
      eval: 'test',
    })(MyClass.prototype, 'testA');

    const plugin = Plugin(MyClass);

    const pluginObject = {
      registerAutocmd: jest.fn(),
      registerCommand: jest.fn(),
      registerFunction: jest.fn(),
    };

    const instance = instantiateOrRun(plugin, pluginObject);

    expect(pluginObject.registerAutocmd).toHaveBeenCalledWith(
      'TestAutocmd',
      [instance, MyClass.prototype.testA],
      {
        pattern: '*.js',
        sync: false,
        eval: 'test',
      }
    );

    expect(pluginObject.registerCommand).toHaveBeenCalledWith(
      'TestCommand',
      [instance, MyClass.prototype.testC],
      { sync: false, range: 'test', nargs: '3' }
    );

    expect(pluginObject.registerFunction).toHaveBeenCalledWith(
      'TestF',
      [instance, MyClass.prototype.testF],
      { sync: false, eval: 'test', range: 'test' }
    );
  });

  it('generates specs from decorated methods', () => {
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

    const plugin = Plugin(MyClass);

    const pluginObject = new NvimPlugin('/tmp/filename', plugin, {});

    expect(pluginObject.specs).toEqual([
      {
        type: 'autocmd',
        name: 'TestAutocmd',
        sync: false,
        opts: {
          pattern: '*.js',
        },
      },
      {
        type: 'command',
        name: 'TestCommand',
        sync: false,
        opts: {},
      },
      {
        type: 'function',
        name: 'TestF',
        sync: false,
        opts: {},
      },
    ]);
  });
});
