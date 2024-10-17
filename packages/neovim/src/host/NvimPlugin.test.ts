import assert from 'node:assert';
import * as sinon from 'sinon';
import { getFakeNvimClient } from '../testUtil';
import { callable, NvimPlugin } from './NvimPlugin';

describe('NvimPlugin', () => {
  it('should initialise variables', () => {
    const fakeNvimClient = getFakeNvimClient();
    const plugin = new NvimPlugin('/tmp/filename', () => {}, fakeNvimClient);

    assert.strictEqual(plugin.filename, '/tmp/filename');
    assert.strictEqual(plugin.nvim, fakeNvimClient);
    assert.strictEqual(plugin.dev, false);
    assert.strictEqual(Object.keys(plugin.autocmds).length, 0);
    assert.strictEqual(Object.keys(plugin.commands).length, 0);
    assert.strictEqual(Object.keys(plugin.functions).length, 0);
  });

  it('should set dev options when you call setOptions', () => {
    const plugin = new NvimPlugin(
      '/tmp/filename',
      () => {},
      getFakeNvimClient()
    );
    plugin.setOptions({ dev: true });
    assert.strictEqual(plugin.dev, true);
    assert.strictEqual(plugin.shouldCacheModule, false);
  });

  it('should store registered autocmds', () => {
    const plugin = new NvimPlugin(
      '/tmp/filename',
      () => {},
      getFakeNvimClient()
    );
    const fn = () => {};
    const opts = { pattern: '*' };
    const spec = {
      name: 'BufWritePre',
      type: 'autocmd',
      sync: false,
      opts,
    };
    plugin.registerAutocmd('BufWritePre', fn, opts);
    assert.strictEqual(Object.keys(plugin.autocmds).length, 1);
    assert.deepStrictEqual(plugin.autocmds['BufWritePre *'], { fn, spec });
  });

  it('should store registered commands', () => {
    const plugin = new NvimPlugin(
      '/tmp/filename',
      () => {},
      getFakeNvimClient()
    );
    const fn = () => {};
    const opts = { sync: true };
    const spec = {
      name: 'MyCommand',
      type: 'command',
      sync: true,
      opts: {},
    };
    plugin.registerCommand('MyCommand', fn, opts);
    assert.strictEqual(Object.keys(plugin.commands).length, 1);
    assert.deepStrictEqual(plugin.commands.MyCommand, { fn, spec });
  });

  it('should store registered functions', () => {
    const plugin = new NvimPlugin(
      '/tmp/filename',
      () => {},
      getFakeNvimClient()
    );
    const fn = () => {};
    const opts = { sync: true };
    const spec = {
      name: 'MyFunction',
      type: 'function',
      sync: true,
      opts: {},
    };
    plugin.registerFunction('MyFunction', fn, opts);
    assert.strictEqual(Object.keys(plugin.functions).length, 1);
    assert.deepStrictEqual(plugin.functions.MyFunction, { fn, spec });
  });

  it('should not add autocmds with no pattern option', () => {
    const plugin = new NvimPlugin(
      '/tmp/filename',
      () => {},
      getFakeNvimClient()
    );
    plugin.registerAutocmd('BufWritePre', () => {}, { pattern: '' });
    assert.strictEqual(Object.keys(plugin.autocmds).length, 0);
  });

  it('should create functions from callable arrays', () => {
    const fn = sinon.spy(function () {
      // @ts-expect-error intentional
      return this;
    });
    assert.strictEqual(callable(fn), fn);
    callable([{}, fn])();
    assert.strictEqual(fn.callCount, 1);

    const thisObj = {};
    assert.strictEqual(callable([thisObj, fn])(), thisObj);

    const plugin = new NvimPlugin(
      '/tmp/filename',
      () => {},
      getFakeNvimClient()
    );
    const obj = {
      func: sinon.spy(function () {
        // @ts-expect-error intentional
        return this;
      }),
    };

    plugin.registerCommand('MyCommand', [obj, obj.func], {});

    const thisObject = plugin.commands.MyCommand.fn('arg1', 'arg2');
    // @ts-expect-error intentional
    assert.strictEqual(obj.func.calledWith('arg1', 'arg2'), true);
    assert.strictEqual(thisObject, obj);
  });

  it('should not register commands with incorrect callable arguments', () => {
    const plugin = new NvimPlugin(
      '/tmp/filename',
      () => {},
      getFakeNvimClient()
    );
    // @ts-expect-error Intentionally passing empty array for command arguments.
    plugin.registerCommand('MyCommand', [], {});
    assert.strictEqual(Object.keys(plugin.commands).length, 0);
  });

  it('should return specs for registered commands', () => {
    const plugin = new NvimPlugin(
      '/tmp/filename',
      () => {},
      getFakeNvimClient()
    );
    const fn = () => {};
    const aOpts = { pattern: '*' };
    const aSpec = {
      name: 'BufWritePre',
      type: 'autocmd',
      sync: false,
      opts: aOpts,
    };
    plugin.registerAutocmd('BufWritePre', fn, aOpts);

    const cOpts = { sync: true };
    const cSpec = {
      name: 'MyCommand',
      type: 'command',
      sync: true,
      opts: {},
    };
    plugin.registerCommand('MyCommand', fn, cOpts);

    const fOpts = { sync: true };
    const fSpec = {
      name: 'MyFunction',
      type: 'function',
      sync: true,
      opts: {},
    };
    plugin.registerFunction('MyFunction', fn, fOpts);

    assert.deepStrictEqual(plugin.specs, [aSpec, cSpec, fSpec]);
  });

  it('should handle requests for registered commands', async () => {
    const plugin = new NvimPlugin(
      '/tmp/filename',
      () => {},
      getFakeNvimClient()
    );
    const fn = (arg: any) => arg;

    plugin.registerAutocmd('BufWritePre', fn, { pattern: '*', sync: true });
    plugin.registerCommand('MyCommand', fn, { sync: true });
    plugin.registerFunction('MyFunction', fn);

    assert.strictEqual(
      await plugin.handleRequest('BufWritePre *', 'autocmd', [true]),
      true
    );
    assert.strictEqual(
      await plugin.handleRequest('MyCommand', 'command', [false]),
      false
    );
    assert.strictEqual(
      await plugin.handleRequest('MyFunction', 'function', ['blue']),
      'blue'
    );
  });

  it('should throw on unknown request', () => {
    const plugin = new NvimPlugin(
      '/tmp/filename',
      () => {},
      getFakeNvimClient()
    );
    assert.rejects(
      plugin.handleRequest('BufWritePre *', 'autocmd', [true]),
      new Error('Missing handler for autocmd: "BufWritePre *" in /tmp/filename')
    );
  });
});
