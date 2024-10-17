import * as path from 'node:path';
import assert from 'node:assert';
import sinon from 'sinon';
import * as testUtil from '../testUtil';

describe('Neovim API', () => {
  let nvim: ReturnType<typeof testUtil.startNvim>[1];

  before(async () => {
    [, nvim] = testUtil.startNvim();
  });

  after(() => {
    testUtil.stopNvim();
  });

  describe('Normal API calls', () => {
    it('gets a list of buffers and switches buffers', async () => {
      const buffers = await nvim.buffers;
      assert.strictEqual(buffers.length, 1);
      buffers[0].name = 'hello.txt';

      await nvim.command('noswapfile e! goodbye.txt');
      assert.strictEqual((await nvim.buffers).length, 2);
      assert((await nvim.buffer.name).match(/goodbye\.txt$/));

      // switch buffers
      [nvim.buffer] = buffers;
      assert((await (await nvim.buffer).name).match(/hello\.txt$/));
    });

    it('can list runtimepaths', async () => {
      assert((await nvim.runtimePaths).length > 0);
    });

    it('can change current working directory', async () => {
      const initial = await nvim.call('getcwd', []);
      const newCwd = path.dirname(initial);

      nvim.dir = newCwd;
      assert.strictEqual(await nvim.call('getcwd', []), newCwd);
    });

    it.skip('can get current mode', async () => {
      const initial = await nvim.mode;
      assert.deepStrictEqual(initial, { mode: 'n', blocking: false });

      await nvim.command('startinsert');
    });

    it('can get color map', async () => {
      const colorMap = await nvim.colorMap;
      assert(Object.keys(colorMap).length > 0);
    });

    it('can get color by name', async () => {
      assert.strictEqual(await nvim.getColorByName('white'), 16777215);
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
      assert(srcId > 0);

      const highlightById = await nvim.getHighlightById(srcId);
      sinon.assert.match(highlightById, { foreground: sinon.match.any });
      assert.deepStrictEqual(await nvim.getHighlight(srcId), highlightById);

      // Note this doesn't work as you would think because
      // addHighlight does not add a highlight group
      assert.deepStrictEqual(await nvim.getHighlightByName('test'), {});

      buffer.remove(0, -1, false);
    });

    it('can run lua', async () => {
      assert.strictEqual(
        await nvim.lua('function test(a) return a end return test(...)', [1]),
        1
      );

      assert.strictEqual(
        await nvim.lua('function test(a) return a end return test(...)', [
          'foo',
        ]),
        'foo'
      );

      assert.strictEqual(
        await nvim.executeLua(
          'function test(a) return a end return test(...)',
          ['foo']
        ),
        'foo'
      );
    });

    it('get/set/delete current line', async () => {
      const line = await nvim.line;
      assert.strictEqual(line, '');

      nvim.line = 'current line';
      assert.strictEqual(await nvim.line, 'current line');

      nvim.deleteCurrentLine();

      assert.strictEqual(await nvim.line, '');
    });

    it('gets v: vars', async () => {
      const initial = await nvim.eval('v:ctype');
      assert.strictEqual(await nvim.getVvar('ctype'), initial);
    });

    it('sets v: vars', async () => {
      await nvim.setVvar('mouse_winid', 2);
      assert.strictEqual(await nvim.eval('v:mouse_winid'), 2);
      assert.strictEqual(await nvim.getVvar('mouse_winid'), 2);
    });

    it('gets string width', async () => {
      assert.strictEqual(await nvim.strWidth('string'), 6);
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
      const parsedExpression = await nvim.parseExpression('@', 'm', true);
      sinon.assert.match(parsedExpression, sinon.match.object);
    });

    it('gets api info', async () => {
      const [, apiInfo] = await nvim.apiInfo;
      sinon.assert.match(apiInfo, {
        version: sinon.match.any,
        functions: sinon.match.any,
        ui_events: sinon.match.any,
        ui_options: sinon.match.any,
        error_types: sinon.match.any,
        types: sinon.match.any,
      });
    });

    it('gets all channels', async () => {
      const chans = await nvim.chans;
      assert(Array.isArray(chans));
      assert(chans.length > 0);
    });

    it('gets channel info', async () => {
      assert(await nvim.getChanInfo(1));
    });

    it('gets commands', async () => {
      assert.deepStrictEqual(await nvim.commands, {});
    });

    it('gets proc', async () => {
      assert.doesNotThrow(async () => nvim.getProc(1));
    });

    it('gets proc children', async () => {
      assert.doesNotThrow(async () => nvim.getProcChildren(1));
    });

    it('gets uis', async () => {
      assert.deepStrictEqual(await nvim.uis, []);
    });

    it('can subscribe to vim events', async () => {
      await nvim.subscribe('test');
      await nvim.unsubscribe('test');
    });

    it('sets clientInfo', async () => {
      assert.doesNotThrow(() => nvim.setClientInfo('test', {}, '', {}, {}));
    });

    it('selects popupmenu item', async () => {
      await nvim.selectPopupmenuItem(0, true, true);
    });

    it('creates and closes a floating window', async () => {
      const numBuffers = (await nvim.buffers).length;
      const numWindows = (await nvim.windows).length;
      const buffer = await nvim.createBuffer(false, false);
      assert.strictEqual((await nvim.buffers).length, numBuffers + 1);
      assert(typeof buffer !== 'number');
      const floatingWindow = await nvim.openWindow(buffer, true, {
        relative: 'editor',
        row: 5,
        col: 5,
        width: 50,
        height: 50,
      });
      assert.strictEqual((await nvim.windows).length, numWindows + 1);
      assert(typeof floatingWindow !== 'number');
      await nvim.windowClose(floatingWindow, true);
      assert.strictEqual((await nvim.windows).length, numWindows);
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
      assert.strictEqual((await nvim.windows).length, numWindows + 1);
      assert.strictEqual(await floatingWindow.height, 10);
      assert.strictEqual(await floatingWindow.width, 10);

      await nvim.windowConfig(floatingWindow, { width: 20, height: 20 });
      assert.strictEqual(await floatingWindow.height, 20);
      assert.strictEqual(await floatingWindow.width, 20);

      await nvim.windowClose(floatingWindow, true);
    });
  });

  describe('Namespaces', () => {
    it('creates and gets anonymous namespaces', async () => {
      const id = await nvim.createNamespace();
      assert.strictEqual(typeof id, 'number');

      assert.deepStrictEqual(await nvim.getNamespaces(), {});
    });

    it('creates and gets named namespaces', async () => {
      const foo = await nvim.createNamespace('foo');
      const bar = await nvim.createNamespace('bar');

      assert.deepStrictEqual(await nvim.getNamespaces(), { foo, bar });
    });
  });
});
