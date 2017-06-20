/* eslint-env jest */
const path = require('path');
const loadPlugin = require('./factory');

const PLUGIN_PATH = path.join(
  __dirname,
  '../../__tests__',
  'integration',
  'rplugin',
  'node',
  'test'
);

describe('Plugin Factory (used by host)', () => {
  let pluginObj;

  beforeEach(() => {
    pluginObj = loadPlugin(PLUGIN_PATH, null);
  });

  it('should collect the specs from a plugin file', () => {
    const exSPECted = [
      {
        type: 'command',
        name: 'JSHostTestCmd',
        sync: true,
        opts: { range: '', nargs: '*' },
      },
      {
        type: 'autocmd',
        name: 'BufEnter',
        sync: true,
        opts: { pattern: '*.test', eval: 'expand("<afile>")' },
      },
      { type: 'function', name: 'Func', sync: true, opts: {} },
    ];
    expect(pluginObj.specs).toEqual(exSPECted);
  });

  it('should collect the handlers from a plugin', () => {
    const handlerId = [PLUGIN_PATH, 'function', 'Func'].join(':');
    const methodName = pluginObj.handlers[handlerId];
    expect(pluginObj.module[methodName]('town')).toEqual('Funcy town');
  });

  it('should load the plugin a sandbox', () => {
    const sandbox = pluginObj.sandbox;
    expect(global.loaded).toBeUndefined();
    expect(sandbox.loaded).toEqual(true);
    expect(Object.keys(sandbox.process)).not.toContain(['chdir', 'exit']);
  });

  it('should load files required by the plugin in a sandbox', () => {
    const required = pluginObj.sandbox.required;
    expect(required).toEqual('you bet!');
    // expect(
    // Object.keys(required.globals.process),
    // ).not.toContain(
    // ['chdir', 'exit'],
    // );
  });

  it('does not create an instance of plugin', () => {
    const samePlugin = loadPlugin(PLUGIN_PATH, null, {
      noCreateInstance: true,
    });
    expect(samePlugin.module).toEqual(null);
  });

  it('does not cache loaded plugins by default', () => {
    const samePlugin = loadPlugin(PLUGIN_PATH, null, {});
    expect(pluginObj.import).not.toEqual(samePlugin.import);
  });

  it('can cache loaded plugins', () => {
    const samePlugin = loadPlugin(PLUGIN_PATH, null, {
      cache: true,
    });
    expect(pluginObj.import).toEqual(samePlugin.import);
  });

  it('loads plugin with instance of nvim API', () => {
    const nvim = {};
    const plugin = loadPlugin(PLUGIN_PATH, nvim, {});
    expect(plugin.module.nvim).toBe(nvim);
  });

  it('sets new neovim API from plugin instance', () => {
    const nvim = {};
    expect(pluginObj.module.nvim).toBe(null);
    pluginObj.module.setApi(nvim);
    expect(pluginObj.module.nvim).toBe(nvim);
  });
});
