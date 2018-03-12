/* eslint-env jest */
import * as path from 'path';
import { loadPlugin } from './factory';
import { NeovimPlugin } from './NeovimPlugin';

const PLUGIN_PATH = path.join(
  __dirname,
  '..',
  '..',
  '__tests__',
  'integration',
  'rplugin',
  'node',
  'test'
);

describe('Plugin Factory (used by host)', () => {
  let pluginObj: NeovimPlugin;

  beforeEach(() => {
    pluginObj = loadPlugin(PLUGIN_PATH, null);
  });

  it('should collect the specs from a plugin file', () => {
    const exSPECted = [
      {
        type: 'autocmd',
        name: 'BufEnter',
        sync: true,
        opts: { pattern: '*.test', eval: 'expand("<afile>")' },
      },
      {
        type: 'command',
        name: 'JSHostTestCmd',
        sync: true,
        opts: { range: '', nargs: '*' },
      },
      { type: 'function', name: 'Func', sync: true, opts: {} },
      { type: 'function', name: 'Global', sync: true, opts: {} },
    ];
    expect(pluginObj.specs).toEqual(exSPECted);
  });

  it('should collect the handlers from a plugin', async () => {
    expect(await pluginObj.handleRequest('Func', 'function', ['town'])).toEqual(
      'Funcy town'
    );
  });

  it('should load the plugin a sandbox', async () => {
    expect(global['loaded']).toBeUndefined();
    expect(
      await pluginObj.handleRequest('Global', 'function', ['loaded'])
    ).toEqual(true);
    expect(
      await pluginObj.handleRequest('Global', 'function', ['process'])
    ).not.toContain(['chdir', 'exit']);
  });

  it('should load files required by the plugin in a sandbox', async () => {
    expect(
      await pluginObj.handleRequest('Global', 'function', ['required'])
    ).toEqual('you bet!');
    // expect(
    // Object.keys(required.globals.process),
    // ).not.toContain(
    // ['chdir', 'exit'],
    // );
  });

  it('loads plugin with instance of nvim API', () => {
    const nvim = {};
    const plugin = loadPlugin(PLUGIN_PATH, nvim, {});
    expect(plugin.nvim).toBe(nvim);
  });
});
