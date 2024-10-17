import { Neovim, NeovimClient, NvimPlugin, loadPlugin } from 'neovim';
import assert from 'node:assert';

function getFakeNvimClient(): NeovimClient {
  const logged: string[] = [];
  let logger2 = {};
  const fakeLog = (msg: any) => {
    logged.push(msg);
    return logger2;
  };
  logger2 = {
    info: fakeLog,
    warn: fakeLog,
    debug: fakeLog,
    error: fakeLog,
  };
  return {
    logger: logger2 as any,
  } as NeovimClient;
}

describe('Plugin Factory (used by host)', () => {
  let pluginObj: NvimPlugin;

  beforeEach(() => {
    const p = loadPlugin('@neovim/example-plugin', getFakeNvimClient());
    if (!p) {
      throw new Error();
    }
    pluginObj = p;
  });

  it('should collect the specs from a plugin file', () => {
    const expected = [
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
    assert.deepStrictEqual(pluginObj.specs, expected);
  });

  it('should collect the handlers from a plugin', async () => {
    assert.strictEqual(
      await pluginObj.handleRequest('Func', 'function', ['town']),
      'Funcy town'
    );
  });

  it('should load the plugin a sandbox', async () => {
    assert.strictEqual(
      await pluginObj.handleRequest('Global', 'function', ['loaded']),
      true
    );
    assert.notStrictEqual(
      await pluginObj.handleRequest('Global', 'function', ['Buffer']),
      undefined
    );
    const result = await pluginObj.handleRequest('Global', 'function', [
      'process',
    ]);

    // expect(
    //   await pluginObj.handleRequest('Global', 'function', ['process'])
    // ).not.toContain(['chdir', 'exit']);

    assert('chdir' in result);
    assert('exit' in result);
  });

  it('should load files required by the plugin in a sandbox', async () => {
    assert.strictEqual(
      await pluginObj.handleRequest('Global', 'function', ['required']),
      'you bet!'
    );
  });

  it('loads plugin with instance of nvim API', () => {
    const nvim = getFakeNvimClient();
    const plugin = loadPlugin('@neovim/example-plugin', nvim);
    assert.strictEqual(plugin?.nvim, nvim);
  });

  it('returns null on invalid module', () => {
    assert.strictEqual(loadPlugin('/asdlfjka/fl', {} as Neovim, {}), null);
  });
});

describe('Plugin Factory (decorator api)', () => {
  let pluginObj: NvimPlugin;

  beforeEach(() => {
    const p = loadPlugin(
      '@neovim/example-plugin-decorators',
      getFakeNvimClient()
    );
    if (!p) {
      throw new Error();
    }
    pluginObj = p;
  });

  it('should collect the specs from a plugin file', () => {
    const expected = [
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
      { type: 'function', name: 'Illegal', sync: true, opts: {} },
      { type: 'function', name: 'Umask', sync: true, opts: {} },
    ];
    assert.deepStrictEqual(pluginObj.specs, expected);
  });

  it('should collect the handlers from a plugin', async () => {
    assert.strictEqual(
      await pluginObj.handleRequest('Func', 'function', ['town']),
      'Funcy town'
    );
  });

  it('should load the plugin in a sandbox', async () => {
    assert.strictEqual(
      await pluginObj.handleRequest('Global', 'function', ['loaded']),
      true
    );
    const result = await pluginObj.handleRequest('Global', 'function', [
      'process',
    ]);

    // expect(
    //   await pluginObj.handleRequest('Global', 'function', ['process'])
    // ).not.toContain(['chdir', 'exit']);
    //
    assert('chdir' in result);
    assert('exit' in result);
  });

  it('should load files required by the plugin in a sandbox', async () => {
    assert.strictEqual(
      await pluginObj.handleRequest('Global', 'function', ['required']),
      'you bet!'
    );
  });

  it('loads plugin with instance of nvim API', () => {
    const nvim = getFakeNvimClient();
    const plugin = loadPlugin('@neovim/example-plugin-decorators', nvim, {});
    assert.strictEqual(plugin!.nvim, nvim);
  });

  it('cannot call illegal process functions', () => {
    const nvim = getFakeNvimClient();
    const plugin = loadPlugin('@neovim/example-plugin-decorators', nvim, {});
    assert.throws(() => plugin!.functions.Illegal.fn());
  });

  it('can read process.umask()', () => {
    const nvim = getFakeNvimClient();
    const plugin = loadPlugin('@neovim/example-plugin-decorators', nvim, {});
    assert.doesNotThrow(() => plugin!.functions.Umask.fn());
    assert.notStrictEqual(plugin!.functions.Umask.fn(), undefined);
  });
});
