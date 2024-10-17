import assert from 'node:assert';
import sinon from 'sinon';
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
    assert(typeof plugin === 'function');
  });

  it('decorates class with dev mode option', () => {
    class MyClass {}

    const plugin = Plugin({ dev: true })(MyClass);
    assert(typeof plugin === 'function');

    const pluginObject = {
      setOptions: sinon.fake(),
      nvim: getFakeNvimClient(),
    };
    instantiateOrRun(plugin, pluginObject);
    pluginObject.setOptions.calledWith({ dev: true });
  });

  it('decorates class methods', () => {
    class MyClass {
      testF() {}

      testC() {}

      testA() {}
    }

    // This is how (closeish) babel applies decorators
    FunctionDecorator('TestF', { eval: 'test', range: [1, 10] })(
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
      registerAutocmd: sinon.fake(),
      registerCommand: sinon.fake(),
      registerFunction: sinon.fake(),
      nvim: getFakeNvimClient(),
    };

    const instance = instantiateOrRun(plugin, pluginObject);

    pluginObject.registerAutocmd.calledWith(
      'TestAutocmd',
      [instance, MyClass.prototype.testA],
      {
        pattern: '*.js',
        sync: false,
        eval: 'test',
      }
    );

    pluginObject.registerCommand.calledWith(
      'TestCommand',
      [instance, MyClass.prototype.testC],
      { sync: false, range: 'test', nargs: '3' }
    );

    pluginObject.registerFunction.calledWith(
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

    const pluginObject = new NvimPlugin(
      '/tmp/filename',
      plugin,
      getFakeNvimClient()
    );

    assert.deepStrictEqual(pluginObject.specs, [
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
