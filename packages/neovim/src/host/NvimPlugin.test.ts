/* eslint-env jest */
import { callable, NvimPlugin } from './NvimPlugin';

describe('NvimPlugin', () => {
  it('should initialise variables', () => {
    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});

    expect(plugin.filename).toEqual('/tmp/filename');
    expect(plugin.nvim).toEqual({});
    expect(plugin.dev).toBe(false);
    expect(Object.keys(plugin.autocmds)).toHaveLength(0);
    expect(Object.keys(plugin.commands)).toHaveLength(0);
    expect(Object.keys(plugin.functions)).toHaveLength(0);
  });

  it('should set dev options when you call setOptions', () => {
    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});
    plugin.setOptions({ dev: true });
    expect(plugin.dev).toBe(true);
    expect(plugin.shouldCacheModule).toBe(false);
  });

  it('should store registered autocmds', () => {
    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});
    const fn = () => {};
    const opts = { pattern: '*' };
    const spec = {
      name: 'BufWritePre',
      type: 'autocmd',
      sync: false,
      opts,
    };
    plugin.registerAutocmd('BufWritePre', fn, opts);
    expect(Object.keys(plugin.autocmds)).toHaveLength(1);
    expect(plugin.autocmds['BufWritePre *']).toEqual({ fn, spec });
  });

  it('should store registered commands', () => {
    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});
    const fn = () => {};
    const opts = { sync: true };
    const spec = {
      name: 'MyCommand',
      type: 'command',
      sync: true,
      opts: {},
    };
    plugin.registerCommand('MyCommand', fn, opts);
    expect(Object.keys(plugin.commands)).toHaveLength(1);
    expect(plugin.commands.MyCommand).toEqual({ fn, spec });
  });

  it('should store registered functions', () => {
    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});
    const fn = () => {};
    const opts = { sync: true };
    const spec = {
      name: 'MyFunction',
      type: 'function',
      sync: true,
      opts: {},
    };
    plugin.registerFunction('MyFunction', fn, opts);
    expect(Object.keys(plugin.functions)).toHaveLength(1);
    expect(plugin.functions.MyFunction).toEqual({ fn, spec });
  });

  it('should not add autocmds with no pattern option', () => {
    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});
    plugin.registerAutocmd('BufWritePre', () => {}, { pattern: '' });
    expect(Object.keys(plugin.autocmds)).toHaveLength(0);
  });

  it('should create functions from callable arrays', () => {
    const fn = jest.fn(function() {
      return this;
    });
    expect(callable(fn)).toEqual(fn);
    callable([{}, fn])();
    expect(fn).toHaveBeenCalledTimes(1);

    const thisObj = {};
    expect(callable([thisObj, fn])()).toBe(thisObj);

    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});
    const obj = {
      func: jest.fn(function() {
        return this;
      }),
    };

    plugin.registerCommand('MyCommand', [obj, obj.func], {});

    const thisObject = plugin.commands.MyCommand.fn('arg1', 'arg2');
    expect(obj.func).toHaveBeenCalledWith('arg1', 'arg2');
    expect(thisObject).toBe(obj);
  });

  it('should not register commands with incorrect callable arguments', () => {
    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});
    plugin.registerCommand('MyCommand', [], {});
    expect(Object.keys(plugin.commands)).toHaveLength(0);
  });

  it('should return specs for registered commands', () => {
    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});
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

    expect(plugin.specs).toEqual([aSpec, cSpec, fSpec]);
  });

  it('should handle requests for registered commands', async () => {
    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});
    const fn = arg => arg;

    plugin.registerAutocmd('BufWritePre', fn, { pattern: '*', sync: true });
    plugin.registerCommand('MyCommand', fn, { sync: true });
    plugin.registerFunction('MyFunction', fn);

    expect(await plugin.handleRequest('BufWritePre *', 'autocmd', [true])).toBe(
      true
    );
    expect(await plugin.handleRequest('MyCommand', 'command', [false])).toBe(
      false
    );
    expect(
      await plugin.handleRequest('MyFunction', 'function', ['blue'])
    ).toEqual('blue');
  });

  it('should throw on unknown request', () => {
    const plugin = new NvimPlugin('/tmp/filename', () => {}, {});
    expect.assertions(1);
    plugin.handleRequest('BufWritePre *', 'autocmd', [true]).catch(err => {
      expect(err).toEqual(
        new Error(
          'Missing handler for autocmd: "BufWritePre *" in /tmp/filename'
        )
      );
    });
  });
});
