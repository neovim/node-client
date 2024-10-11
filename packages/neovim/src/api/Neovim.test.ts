import * as path from 'node:path';
import assert from 'node:assert';
import expect from 'expect';
import { nvim } from '../testUtil';

describe('Neovim API', () => {
  describe('Normal API calls', () => {
    it('gets a list of buffers and switches buffers', async () => {
      const buffers = await nvim.buffers;
      expect(buffers.length).toBe(1);
      buffers[0].name = 'hello.txt';

      nvim.command('noswapfile e! goodbye.txt');
      expect((await nvim.buffers).length).toBe(2);
      expect(await nvim.buffer.name).toMatch(/goodbye\.txt$/);

      // switch buffers
      [nvim.buffer] = buffers;
      expect(await (await nvim.buffer).name).toMatch(/hello\.txt$/);
    });

    it('can list runtimepaths', async () => {
      expect((await nvim.runtimePaths).length).toBeGreaterThan(0);
    });

    it('can change current working directory', async () => {
      const initial = await nvim.call('getcwd', []);
      const newCwd = path.dirname(initial);

      nvim.dir = newCwd;
      expect(await nvim.call('getcwd', [])).toBe(newCwd);
    });

    it.skip('can get current mode', async () => {
      const initial = await nvim.mode;
      expect(initial).toEqual({ mode: 'n', blocking: false });

      await nvim.command('startinsert');
    });

    it('can get color map', async () => {
      const colorMap = await nvim.colorMap;
      expect(Object.keys(colorMap).length).toBeGreaterThan(0);
    });

    it('can get color by name', async () => {
      expect(await nvim.getColorByName('white')).toBe(16777215);
    });

    it('can get highlight by name or id', async () => {
      const buffer = await nvim.buffer;

      await buffer.append('hello world');
      const srcId = await buffer.addHighlight({
        hlGroup: 'test',
        line: 0,
        colStart: 0,
        colEnd: 3,
        srcId: 0,
      });
      expect(srcId).toBeGreaterThan(0);

      const highlightById = await nvim.getHighlightById(srcId);
      expect(highlightById).toEqual(
        expect.objectContaining({
          foreground: expect.anything(),
        })
      );
      expect(await nvim.getHighlight(srcId)).toEqual(highlightById);

      // Note this doesn't work as you would think because
      // addHighlight does not add a highlight group
      expect(await nvim.getHighlightByName('test')).toEqual({});

      buffer.remove(0, -1, false);
    });

    it('can run lua', async () => {
      expect(
        await nvim.lua('function test(a) return a end return test(...)', [1])
      ).toBe(1);

      expect(
        await nvim.lua('function test(a) return a end return test(...)', [
          'foo',
        ])
      ).toBe('foo');

      expect(
        await nvim.executeLua(
          'function test(a) return a end return test(...)',
          ['foo']
        )
      ).toBe('foo');
    });

    it('get/set/delete current line', async () => {
      const line = await nvim.line;
      expect(line).toBe('');

      nvim.line = 'current line';
      expect(await nvim.line).toBe('current line');

      nvim.deleteCurrentLine();

      expect(await nvim.line).toBe('');
    });

    it('gets v: vars', async () => {
      const initial = await nvim.eval('v:ctype');
      expect(await nvim.getVvar('ctype')).toBe(initial);
    });

    it('sets v: vars', async () => {
      await nvim.setVvar('mouse_winid', 2);
      expect(await nvim.eval('v:mouse_winid')).toBe(2);
      expect(await nvim.getVvar('mouse_winid')).toBe(2);
    });

    it('gets string width', async () => {
      expect(await nvim.strWidth('string')).toBe(6);
    });

    it('write to vim output buffer', async () => {
      // TODO how to test this?
      nvim.outWrite('test');
    });

    it('write to vim error buffer', async () => {
      // TODO how to test this?
      nvim.errWrite('test');
      nvim.errWriteLine('test');
    });

    it('parse expression', async () => {
      expect(await nvim.parseExpression('@', 'm', true)).toEqual(
        expect.objectContaining({})
      );
    });

    it('gets api info', async () => {
      const [, apiInfo] = await nvim.apiInfo;
      expect(apiInfo).toEqual(
        expect.objectContaining({
          version: expect.anything(),
          functions: expect.anything(),
          ui_events: expect.anything(),
          ui_options: expect.anything(),
          error_types: expect.anything(),
          types: expect.anything(),
        })
      );
    });

    it('gets all channels', async () => {
      const chans = await nvim.chans;
      expect(chans).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            stream: expect.anything(),
            mode: expect.anything(),
          }),
        ])
      );
    });

    it('gets channel info', async () => {
      expect(await nvim.getChanInfo(1)).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          stream: expect.anything(),
          mode: expect.anything(),
        })
      );
    });

    it('gets commands', async () => {
      expect(await nvim.commands).toEqual({});
    });

    it('gets proc', async () => {
      expect(async () => nvim.getProc(1)).not.toThrow();
    });

    it('gets proc children', async () => {
      expect(async () => nvim.getProcChildren(1)).not.toThrow();
    });

    it('gets uis', async () => {
      expect(await nvim.uis).toEqual([]);
    });

    it('can subscribe to vim events', async () => {
      await nvim.subscribe('test');
      await nvim.unsubscribe('test');
    });

    it('sets clientInfo', async () => {
      expect(() => nvim.setClientInfo('test', {}, '', {}, {})).not.toThrow();
    });

    it('selects popupmenu item', async () => {
      await nvim.selectPopupmenuItem(0, true, true);
    });

    it('creates and closes a floating window', async () => {
      const numBuffers = (await nvim.buffers).length;
      const numWindows = (await nvim.windows).length;
      const buffer = await nvim.createBuffer(false, false);
      expect(await nvim.buffers).toHaveLength(numBuffers + 1);
      assert(typeof buffer !== 'number');
      const floatingWindow = await nvim.openWindow(buffer, true, {
        relative: 'editor',
        row: 5,
        col: 5,
        width: 50,
        height: 50,
      });
      expect(await nvim.windows).toHaveLength(numWindows + 1);
      assert(typeof floatingWindow !== 'number');
      await nvim.windowClose(floatingWindow, true);
      expect(await nvim.windows).toHaveLength(numWindows);
    });

    it('resizes a window', async () => {
      const numWindows = (await nvim.windows).length;
      const buffer = await nvim.createBuffer(false, false);
      assert(typeof buffer !== 'number');
      const floatingWindow = await nvim.openWindow(buffer, true, {
        relative: 'editor',
        row: 5,
        col: 5,
        width: 10,
        height: 10,
      });
      assert(typeof floatingWindow !== 'number');
      expect(await nvim.windows).toHaveLength(numWindows + 1);
      expect(await floatingWindow.height).toBe(10);
      expect(await floatingWindow.width).toBe(10);

      await nvim.windowConfig(floatingWindow, { width: 20, height: 20 });
      expect(await floatingWindow.height).toBe(20);
      expect(await floatingWindow.width).toBe(20);

      await nvim.windowClose(floatingWindow, true);
    });
  });

  describe('Namespaces', () => {
    it('creates and gets anonymous namespaces', async () => {
      const id = await nvim.createNamespace();
      expect(typeof id).toBe('number');

      expect(await nvim.getNamespaces()).toEqual({});
    });

    it('creates and gets named namespaces', async () => {
      const foo = await nvim.createNamespace('foo');
      const bar = await nvim.createNamespace('bar');

      expect(await nvim.getNamespaces()).toEqual({ foo, bar });
    });
  });
});
