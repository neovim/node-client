import expect from 'expect';
import * as jestMock from 'jest-mock';
import { plugin as Plugin } from './plugin';
import { NvimPlugin } from '../host/NvimPlugin';
import { nvimFunction as FunctionDecorator } from './function';
import { command as Command } from './command';
import { autocmd as Autocmd } from './autocmd';
import { getFakeNvimClient } from '../testUtil';

const instantiateOrRun = (Fn: ReturnType<typeof Plugin>, ...args: any[]) => {
  try {
    return new Fn(...args);
  } catch (err) {
    if (err instanceof TypeError) {
      return Fn(...args);
    }
    throw err;
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

    const pluginObject = {
      setOptions: jestMock.fn(),
      nvim: getFakeNvimClient(),
    };
    instantiateOrRun(plugin, pluginObject);
    expect(pluginObject.setOptions).toHaveBeenCalledWith({ dev: true });
  });

  it('decorates class methods', () => {
    class MyClass {
      testF() {}

      testC() {}

      testA() {}
    }

    // This is how (closeish) babel applies decorators
    FunctionDecorator('TestF', { eval: 'test', range: [1, 10] })(MyClass.prototype, 'testF');
    Command('TestCommand', { range: 'test', nargs: '3' })(MyClass.prototype, 'testC');
    Autocmd('TestAutocmd', {
      pattern: '*.js',
      eval: 'test',
    })(MyClass.prototype, 'testA');

    const plugin = Plugin(MyClass);

    const pluginObject = {
      registerAutocmd: jestMock.fn(),
      registerCommand: jestMock.fn(),
      registerFunction: jestMock.fn(),
      nvim: getFakeNvimClient(),
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
      { sync: false, eval: 'test', range: [1, 10] }
    );
  });

  it('generates specs from decorated methods', () => {
    class MyClass {
      testF() {}

      testC() {}

      testA() {}
    }

    // This is how (closeish) babel applies decorators
    FunctionDecorator('TestF')(MyClass.prototype, 'testF');
    Command('TestCommand')(MyClass.prototype, 'testC');
    Autocmd('TestAutocmd', {
      pattern: '*.js',
    })(MyClass.prototype, 'testA');

    const plugin = Plugin(MyClass);

    const pluginObject = new NvimPlugin('/tmp/filename', plugin, getFakeNvimClient());

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
