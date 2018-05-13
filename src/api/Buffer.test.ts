/* eslint-env jest */
import * as cp from 'child_process';
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

describe.only('Buffer API', () => {
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

  it('gets the current buffer', async () => {
    const buffer = await nvim.buffer;
    expect(buffer).toBeInstanceOf(nvim.Buffer);
  });

  describe('Normal API calls', () => {
    let buffer;
    beforeEach(async () => {
      buffer = await nvim.buffer;
    });

    it('gets changedtick of buffer', async () => {
      const initial = await buffer.changedtick;

      // insert a line
      buffer.append('hi');
      expect(await buffer.changedtick).toBe(initial + 1);

      // clear buffer
      buffer.remove(0, -1, false);
      expect(await buffer.changedtick).toBe(initial + 2);
    });

    it('gets the current buffer name', async () => {
      const name = await buffer.name;
      expect(name).toMatch('test.js');
    });

    it('is a valid buffer', async () => {
      expect(await buffer.valid).toBe(true);
    });

    it('sets current buffer name to "foo.js"', async () => {
      buffer.name = 'foo.js';
      expect(await buffer.name).toMatch('foo.js');
      buffer.name = 'test.js';
      expect(await buffer.name).toMatch('test.js');
    });

    it('can replace first line of buffer with a string', async () => {
      buffer.replace('test', 0);
      expect(await buffer.lines).toEqual(['test']);
    });

    it('can insert lines at beginning of buffer', async () => {
      buffer.insert(['test', 'foo'], 0);
      expect(await buffer.lines).toEqual(['test', 'foo', 'test']);
    });

    it('can replace buffer starting at line 1', async () => {
      buffer.replace(['bar', 'bar', 'bar'], 1);
      expect(await buffer.lines).toEqual(['test', 'bar', 'bar', 'bar']);
    });

    it('inserts line at index 2', async () => {
      buffer.insert(['foo'], 2);
      expect(await buffer.lines).toEqual(['test', 'bar', 'foo', 'bar', 'bar']);
    });

    it('removes last 2 lines', async () => {
      buffer.remove(-3, -1);
      expect(await buffer.lines).toEqual(['test', 'bar', 'foo']);
    });

    it('append lines to end of buffer', async () => {
      buffer.append(['test', 'test']);
      expect(await buffer.lines).toEqual([
        'test',
        'bar',
        'foo',
        'test',
        'test',
      ]);
    });

    it('can clear the buffer', async () => {
      buffer.remove(0, -1);
      // One empty line
      expect(await buffer.length).toEqual(1);
      expect(await buffer.lines).toEqual(['']);
    });

    it('changes buffer options', async () => {
      const initial = await buffer.getOption('copyindent');
      buffer.setOption('copyindent', true);
      expect(await buffer.getOption('copyindent')).toBe(true);
      buffer.setOption('copyindent', false);
      expect(await buffer.getOption('copyindent')).toBe(false);

      // Restore option
      buffer.setOption('copyindent', initial);
      expect(await buffer.getOption('copyindent')).toBe(initial);
    });

    it('returns null if variable is not found', async () => {
      const test = await buffer.getVar('test');
      expect(test).toBe(null);
    });

    it('can set a b: variable to an object', async () => {
      buffer.setVar('test', { foo: 'testValue' });

      expect(await buffer.getVar('test')).toEqual({ foo: 'testValue' });

      expect(await nvim.eval('b:test')).toEqual({ foo: 'testValue' });
    });

    it('can delete a b: variable', async () => {
      buffer.deleteVar('test');

      expect(await nvim.eval('exists("b:test")')).toBe(0);

      expect(await buffer.getVar('test')).toBe(null);
    });

    // TODO: How do we run integration tests for add/clear highlights? and get mark
  });

  describe('Chainable API calls', () => {
    it('gets the current buffer name using api chaining', async done => {
      expect(await nvim.buffer.name).toMatch('test.js');

      nvim.buffer.name.then(name => {
        expect(name).toMatch('test.js');
        done();
      });
    });

    it('can chain calls from Base class i.e. getOption', async () => {
      const initial = await nvim.buffer.getOption('copyindent');
      nvim.buffer.setOption('copyindent', true);
      expect(await nvim.buffer.getOption('copyindent')).toBe(true);
      nvim.buffer.setOption('copyindent', false);
      expect(await nvim.buffer.getOption('copyindent')).toBe(false);

      // Restore option
      nvim.buffer.setOption('copyindent', initial);
      expect(await nvim.buffer.getOption('copyindent')).toBe(initial);
    });

    it('sets current buffer name to "bar.js" using api chaining', async () => {
      nvim.buffer.name = 'bar.js';
      expect(await nvim.buffer.name).toMatch('bar.js');
      nvim.buffer.name = 'test.js';
      expect(await nvim.buffer.name).toMatch('test.js');
    });

    it('can replace first line of nvim.buffer with a string', async () => {
      nvim.buffer.replace('test', 0);
      expect(await nvim.buffer.lines).toEqual(['test']);
    });

    it('can insert lines at beginning of buffer', async () => {
      nvim.buffer.insert(['test', 'foo'], 0);
      expect(await nvim.buffer.lines).toEqual(['test', 'foo', 'test']);
    });

    it('can replace nvim.buffer starting at line 1', async () => {
      nvim.buffer.replace(['bar', 'bar', 'bar'], 1);
      expect(await nvim.buffer.lines).toEqual(['test', 'bar', 'bar', 'bar']);
    });

    it('inserts line at index 2', async () => {
      nvim.buffer.insert(['foo'], 2);
      expect(await nvim.buffer.lines).toEqual([
        'test',
        'bar',
        'foo',
        'bar',
        'bar',
      ]);
    });

    it('removes last 2 lines', async () => {
      nvim.buffer.remove(-3, -1);
      expect(await nvim.buffer.lines).toEqual(['test', 'bar', 'foo']);
    });

    it('append lines to end of buffer', async () => {
      nvim.buffer.append(['test', 'test']);
      expect(await nvim.buffer.lines).toEqual([
        'test',
        'bar',
        'foo',
        'test',
        'test',
      ]);
    });

    it('can clear the buffer', async () => {
      nvim.buffer.remove(0, -1);
      // One empty line
      expect(await nvim.buffer.length).toEqual(1);
      expect(await nvim.buffer.lines).toEqual(['']);
    });
  });
});
