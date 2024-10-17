import assert from 'node:assert';
import * as testUtil from '../testUtil';
import type { Window } from './Window';

describe('Window API', () => {
  let nvim: ReturnType<typeof testUtil.startNvim>[1];

  before(async () => {
    [, nvim] = testUtil.startNvim();
  });

  after(() => {
    testUtil.stopNvim();
  });

  it('gets the current Window', async () => {
    const win = await nvim.window;
    assert(win instanceof nvim.Window);
  });

  it('get windowid by id', async () => {
    const win = await nvim.window;
    const winid = await nvim.call('win_getid');
    assert.strictEqual(win.id, winid);
  });

  describe('Normal API calls', () => {
    let win: Window;

    beforeEach(async () => {
      win = await nvim.window;
    });

    it('gets the current win number', async () => {
      assert.strictEqual(await win.number, 1);
    });

    it('is a valid win', async () => {
      assert.strictEqual(await win.valid, true);
    });

    it('gets current tabpage from window', async () => {
      assert((await win.tabpage) instanceof nvim.Tabpage);
    });

    it('gets current buffer from window', async () => {
      assert((await win.buffer) instanceof nvim.Buffer);
    });

    it('gets current cursor position', async () => {
      assert.deepStrictEqual(await win.cursor, [1, 0]);
    });

    it('has same cursor position after appending a line to buffer', async () => {
      await (await win.buffer).append(['test']);
      assert.deepStrictEqual(await win.buffer.lines, ['', 'test']);
      assert.deepStrictEqual(await win.cursor, [1, 0]);
    });

    it('changes cursor position', async () => {
      win.cursor = [2, 2];
      assert.deepStrictEqual(await win.cursor, [2, 2]);
    });

    it('has correct height after ":split"', async () => {
      const currentHeight = await win.height;
      await nvim.command('split');
      assert.strictEqual(await win.height, Math.floor(currentHeight / 2));

      win.height = 5;
      assert.strictEqual(await win.height, 5);

      await nvim.command('q');
      assert.strictEqual(await win.height, currentHeight);
    });

    it('has correct width after ":vsplit"', async () => {
      const width = await win.width;
      await nvim.command('vsplit');
      assert.strictEqual(await win.width, Math.floor(width / 2) - 1);

      win.width = 10;
      assert.strictEqual(await win.width, 10);

      await nvim.command('q');
      assert.strictEqual(await win.width, width);
    });

    it('can get the window position', async () => {
      assert.deepStrictEqual(await win.position, [0, 0]);
      assert.strictEqual(await win.row, 0);
      assert.strictEqual(await win.col, 0);
    });

    it('has the right window positions in display cells', async () => {
      let windows: Awaited<typeof nvim.windows>;
      await nvim.command('vsplit');

      // XXX If we re-use `win` without a new call to `nvim.window`,
      // then `win` will reference the new split
      win = await nvim.window;
      assert.strictEqual(await win.row, 0);
      assert.strictEqual(await win.col, 0);

      windows = await nvim.windows;
      // Set to new split
      [, nvim.window] = windows;

      win = await nvim.window;
      assert.strictEqual(await win.row, 0);
      assert((await win.col) > 0);

      await nvim.command('split');
      windows = await nvim.windows;
      [, , nvim.window] = windows;

      win = await nvim.window;
      assert((await win.row) > 0);
      assert((await win.col) > 0);
    });

    it('changes window options', async () => {
      const list = await win.getOption('list');
      win.setOption('list', true);
      assert.strictEqual(await win.getOption('list'), true);
      win.setOption('list', false);
      assert.strictEqual(await win.getOption('list'), false);
      assert(list !== undefined);
      // Restore option
      win.setOption('list', list);
      assert.strictEqual(await win.getOption('list'), list);
    });

    it('returns null if variable is not found', async () => {
      const test = await win.getVar('test');
      assert.strictEqual(test, null);
    });

    it('can set a w: variable', async () => {
      await win.setVar('test', 'testValue');

      assert.strictEqual(await win.getVar('test'), 'testValue');
      assert.strictEqual(await nvim.eval('w:test'), 'testValue');
    });

    it('can delete a w: variable', async () => {
      await win.deleteVar('test');

      assert.strictEqual(await nvim.eval('exists("w:test")'), 0);
      assert.strictEqual(await win.getVar('test'), null);
    });
  });

  describe('Chainable API calls', () => {
    it('gets the current tabpage', async () => {
      assert((await nvim.window.tabpage) instanceof nvim.Tabpage);
    });

    it('is a valid window', async () => {
      assert.strictEqual(await nvim.window.valid, true);
    });

    it('gets the current buffer', async () => {
      assert((await nvim.window.buffer) instanceof nvim.Buffer);
    });

    it.skip('gets current lines in buffer', async () => {
      assert.deepStrictEqual(await (await nvim.window.buffer).lines, ['test']);
    });
  });
});
