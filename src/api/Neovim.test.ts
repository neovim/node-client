/* eslint-env jest */
import * as cp from 'child_process';
import * as path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as which from 'which';
import { attach } from '../attach';

try {
  which.sync('nvim');
} catch (e) {
  // eslint-disable-next-line no-console
  console.error(
    'A Neovim installation is required to run the tests',
    '(see https://github.com/neovim/neovim/wiki/Installing)'
  );
  process.exit(1);
}

describe('Neovim API', () => {
  let proc;
  let nvim;

  beforeAll(async done => {
    proc = cp.spawn(
      'nvim',
      ['-u', 'NONE', '-N', '--embed', '-c', 'set noswapfile', 'test.js'],
      {
        cwd: __dirname,
      }
    );

    nvim = await attach({ proc });

    done();
  });

  afterAll(() => {
    nvim.quit();
    if (proc) {
      proc.disconnect();
    }
  });

  beforeEach(() => {});

  describe('Normal API calls', () => {
    it('gets a list of buffers and switches buffers', async () => {
      const buffers = await nvim.buffers;
      expect(buffers.length).toBe(1);
      const initialBufferName = await buffers[0].name;

      nvim.command('e test2.js');
      expect((await nvim.buffers).length).toBe(2);
      expect(await nvim.buffer.name).toEqual(
        initialBufferName.replace('test', 'test2')
      );

      // switch buffers
      nvim.buffer = buffers[0];
      expect(await nvim.buffer.name).toEqual(initialBufferName);
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
        await nvim.lua('function test(a) return a end return test(...)', 1)
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
  });

  describe.skip('Chainable API calls', () => {});
});
