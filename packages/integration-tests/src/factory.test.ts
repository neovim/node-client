import { Neovim, NeovimClient, NvimPlugin, loadPlugin } from 'neovim';
import expect from 'expect';

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
    expect(pluginObj.specs).toEqual(expected);
  });

  it('should collect the handlers from a plugin', async () => {
    expect(await pluginObj.handleRequest('Func', 'function', ['town'])).toEqual('Funcy town');
  });

  it('should load the plugin a sandbox', async () => {
    expect(await pluginObj.handleRequest('Global', 'function', ['loaded'])).toEqual(true);
    expect(await pluginObj.handleRequest('Global', 'function', ['Buffer'])).not.toEqual(undefined);
    // expect(await pluginObj.handleRequest('Global', 'function', ['process'])).not.toContain([
    //   'chdir',
    //   'exit',
    // ]);
  });

  it('should load files required by the plugin in a sandbox', async () => {
    expect(await pluginObj.handleRequest('Global', 'function', ['required'])).toEqual('you bet!');
    // expect(
    // Object.keys(required.globals.process),
    // ).not.toContain(
    // ['chdir', 'exit'],
    // );
  });

  it('loads plugin with instance of nvim API', () => {
    const nvim = getFakeNvimClient();
    const plugin = loadPlugin('@neovim/example-plugin', nvim);
    expect(plugin?.nvim).toBe(nvim);
  });

  it('returns null on invalid module', () => {
    expect(loadPlugin('/asdlfjka/fl', {} as Neovim, {})).toBeNull();
  });
});

describe('Plugin Factory (decorator api)', () => {
  let pluginObj: NvimPlugin;

  beforeEach(() => {
    const p = loadPlugin('@neovim/example-plugin-decorators', getFakeNvimClient());
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
    ];
    expect(pluginObj.specs).toEqual(expect.arrayContaining(expected));
  });

  it('should collect the handlers from a plugin', async () => {
    expect(await pluginObj.handleRequest('Func', 'function', ['town'])).toEqual('Funcy town');
  });

  it('should load the plugin a sandbox', async () => {
    expect(await pluginObj.handleRequest('Global', 'function', ['loaded'])).toEqual(true);
    // expect(await pluginObj.handleRequest('Global', 'function', ['process'])).not.toContain([
    //   'chdir',
    //   'exit',
    // ]);
  });

  it('should load files required by the plugin in a sandbox', async () => {
    expect(await pluginObj.handleRequest('Global', 'function', ['required'])).toEqual('you bet!');
    // expect(
    // Object.keys(required.globals.process),
    // ).not.toContain(
    // ['chdir', 'exit'],
    // );
  });

  it('loads plugin with instance of nvim API', () => {
    const nvim = getFakeNvimClient();
    const plugin = loadPlugin('@neovim/example-plugin-decorators', nvim, {});
    expect(plugin!.nvim).toBe(nvim);
  });

  it('cannot call illegal process functions', () => {
    const nvim = getFakeNvimClient();
    const plugin = loadPlugin('@neovim/example-plugin-decorators', nvim, {});
    expect(plugin!.functions.Illegal.fn).toThrow();
  });

  it('can read process.umask()', () => {
    const nvim = getFakeNvimClient();
    const plugin = loadPlugin('@neovim/example-plugin-decorators', nvim, {});
    expect(() => plugin!.functions.Umask.fn()).not.toThrow();
    expect(plugin!.functions.Umask.fn()).toBeDefined();
  });
});
