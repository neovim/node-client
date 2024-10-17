import * as sinon from 'sinon';
import assert from 'node:assert';
import * as testUtil from '../testUtil';
import type { Tabpage } from './Tabpage';

describe('Tabpage API', () => {
  let nvim: ReturnType<typeof testUtil.startNvim>[1];

  before(async () => {
    [, nvim] = testUtil.startNvim();
  });

  after(() => {
    testUtil.stopNvim();
  });

  it('gets the current Tabpage', async () => {
    const tabpage = await nvim.tabpage;
    assert(tabpage instanceof nvim.Tabpage);
  });

  describe('Normal API calls', () => {
    let tabpage: Tabpage;

    beforeEach(async () => {
      tabpage = await nvim.tabpage;
    });

    after(() => nvim.command('tabclose'));

    it('gets the current tabpage number', async () => {
      assert.strictEqual(await tabpage.number, 1);
    });

    it('is a valid tabpage', async () => {
      assert.strictEqual(await tabpage.valid, true);
    });

    it('adds a tabpage and switches to it', async () => {
      await nvim.command('tabnew');

      // Switch to new tabpage
      const tabpages = await nvim.tabpages;
      assert.strictEqual(tabpages.length, 2);

      nvim.tabpage = tabpages[tabpages.length - 1];

      const newTabPage = await nvim.tabpage;
      assert.strictEqual(await newTabPage.number, 2);
    });

    it('gets current window in tabpage', async () => {
      const window = await tabpage.window;
      assert(window instanceof nvim.Window);
    });

    it('gets list of windows in tabpage', async () => {
      const windows = await tabpage.windows;
      assert.strictEqual(windows.length, 1);

      // Add a new window
      await nvim.command('vsplit');

      const newWindows = await tabpage.windows;
      assert.strictEqual(newWindows.length, 2);
    });

    it('logs an error when calling `getOption`', () => {
      const spy = sinon.spy(tabpage.logger, 'error');

      tabpage.getOption();
      assert.strictEqual(spy.callCount, 1);

      tabpage.setOption();
      assert.strictEqual(spy.callCount, 2);
    });

    it('returns null if variable is not found', async () => {
      const test = await tabpage.getVar('test');
      assert.strictEqual(test, null);
    });

    it('can set a t: variable', async () => {
      await tabpage.setVar('test', 'testValue');

      assert.strictEqual(await tabpage.getVar('test'), 'testValue');
      assert.strictEqual(await nvim.eval('t:test'), 'testValue');
    });

    it('can delete a t: variable', async () => {
      await tabpage.deleteVar('test');

      assert.strictEqual(await nvim.eval('exists("t:test")'), 0);
      assert.strictEqual(await tabpage.getVar('test'), null);
    });
  });

  describe('Chainable API calls', () => {
    it('gets the current tabpage number', async () => {
      assert.strictEqual(await nvim.tabpage.number, 1);
    });

    it('is a valid tabpage', async () => {
      assert.strictEqual(await nvim.tabpage.valid, true);
    });

    it('adds a tabpage and switches to it', async () => {
      await nvim.command('tabnew');

      // Switch to new tabpage
      const tabpages = await nvim.tabpages;
      assert.strictEqual((await nvim.tabpages).length, 2);

      nvim.tabpage = tabpages[tabpages.length - 1];

      assert.strictEqual(await nvim.tabpage.number, 2);
    });

    it('gets current window in tabpage', async () => {
      const window = await nvim.tabpage.window;
      assert(window instanceof nvim.Window);
    });

    it('gets list of windows in tabpage', async () => {
      const windows = await nvim.tabpage.windows;
      assert.strictEqual(windows.length, 1);

      // Add a new window
      await nvim.command('vsplit');

      // Check the new window count
      assert.strictEqual((await nvim.tabpage.windows).length, 2);
    });
  });
});
