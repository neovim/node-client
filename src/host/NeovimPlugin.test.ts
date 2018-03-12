/* eslint-env jest */
import { NeovimPlugin } from './NeovimPlugin';

describe('NeovimPlugin', () => {
  it('should initialise variables', () => {
    const plugin = new NeovimPlugin('/tmp/filename');

    expect(plugin.filename).toEqual('/tmp/filename');
    expect(plugin.nvim).toBeUndefined();
    expect(plugin.dev).toBe(false);
    expect(Object.keys(plugin.autocmds)).toHaveLength(0);
    expect(Object.keys(plugin.commands)).toHaveLength(0);
    expect(Object.keys(plugin.functions)).toHaveLength(0);
  });

  it('should set dev options when you call setOptions', () => {
    const plugin = new NeovimPlugin('/tmp/filename');
    plugin.setOptions({ dev: true });
    expect(plugin.dev).toBe(true);
  });

  it('should store registered autocmds', () => {
    const plugin = new NeovimPlugin('/tmp/filename');
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
    const plugin = new NeovimPlugin('/tmp/filename');
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
    const plugin = new NeovimPlugin('/tmp/filename');
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
    const plugin = new NeovimPlugin('/tmp/filename');
    plugin.registerAutocmd('BufWritePre', () => {}, { pattern: '' });
    expect(Object.keys(plugin.autocmds)).toHaveLength(0);
  });

  it('should create functions from callable arrays', () => {
    const plugin = new NeovimPlugin('/tmp/filename');
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
    const plugin = new NeovimPlugin('/tmp/filename');
    plugin.registerCommand('MyCommand', [], {});
    expect(Object.keys(plugin.commands)).toHaveLength(0);
  });
});
