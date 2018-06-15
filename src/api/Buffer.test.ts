/* eslint-env jest */
import * as cp from 'child_process';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as which from 'which';
import { attach } from '../attach';
import { NeovimClient } from '../api/client';

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

describe('Buffer API', () => {
  let proc;
  let nvim: NeovimClient;

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

  it('get bufnr by id', async () => {
    const buffer = await nvim.buffer;
    const bufnr = await nvim.call('bufnr', ['%']);
    expect(buffer.id).toBe(bufnr);
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

    it('can get list of commands', async () => {
      expect(await nvim.buffer.commands).toEqual({});
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

describe('Buffer event updates', () => {
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

  beforeEach(async () => {
    await nvim.buffer.remove(0, -1);
  });

  it('can listen and unlisten', async () => {
    const buffer = await nvim.buffer;
    const mock = jest.fn();
    const unlisten = buffer.listen('lines', mock);
    await nvim.buffer.insert(['bar'], 1);
    expect(mock).toHaveBeenCalledTimes(1);
    unlisten();
    await nvim.buffer.insert(['bar'], 1);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('can use `buffer.off` to unlisten', async () => {
    const buffer = await nvim.buffer;
    const mock = jest.fn();
    buffer.listen('lines', mock);
    await nvim.buffer.insert(['bar'], 1);
    expect(mock).toHaveBeenCalledTimes(1);
    buffer.unlisten('lines', mock);
    await nvim.buffer.insert(['bar'], 1);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('listens to line updates', async done => {
    const buffer = await nvim.buffer;
    const bufferName = await buffer.name;
    await buffer.insert(['test', 'foo'], 0);

    const unlisten = buffer.listen(
      'lines',
      async (currentBuffer, tick, start, end, data) => {
        expect(await currentBuffer.name).toBe(bufferName);
        expect(start).toBe(1);
        expect(end).toBe(1);
        expect(data).toEqual(['bar']);
        unlisten();
        done();
      }
    );

    await nvim.buffer.insert(['bar'], 1);
  });

  it('has listener on multiple buffers ', async () => {
    await nvim.command('new');
    const buffers = await nvim.buffers;
    const foo = jest.fn();
    const bar = jest.fn();

    buffers[0].listen('lines', foo);
    buffers[1].listen('lines', bar);

    await nvim.buffer.insert(['bar'], 1);
    expect(foo).toHaveBeenCalledTimes(0);
    expect(bar).toHaveBeenCalledTimes(1);
    await nvim.command('q!');

    await nvim.buffer.insert(['foo'], 0);
    expect(foo).toHaveBeenCalledTimes(1);
    expect(bar).toHaveBeenCalledTimes(1);

    buffers[0].unlisten('lines', foo);
    buffers[1].unlisten('lines', bar);
    await nvim.command('e!');
  });

  it('has multiple listeners for same event, on same buffer', async () => {
    const buffer = await nvim.buffer;
    const foo = jest.fn();
    const bar = jest.fn();

    const unlisten1 = buffer.listen('lines', foo);
    const unlisten2 = buffer.listen('lines', bar);

    await nvim.buffer.insert(['bar'], 1);
    expect(foo).toHaveBeenCalledTimes(1);
    expect(bar).toHaveBeenCalledTimes(1);

    unlisten2();

    await nvim.buffer.insert(['foo'], 0);
    expect(foo).toHaveBeenCalledTimes(2);
    expect(bar).toHaveBeenCalledTimes(1);

    unlisten1();
    await nvim.command('e!');
  });

  it('has multiple listeners for different events, on same buffer', async () => {
    const buffer = await nvim.buffer;
    const foo = jest.fn();
    const bar = jest.fn();

    const unlisten1 = buffer.listen('lines', foo);
    const unlisten2 = buffer.listen('changedtick', bar);

    await nvim.buffer.insert(['bar'], 1);
    expect(foo).toHaveBeenCalledTimes(1);
    expect(bar).toHaveBeenCalledTimes(1);

    unlisten2();

    await nvim.buffer.insert(['foo'], 0);
    expect(foo).toHaveBeenCalledTimes(2);
    expect(bar).toHaveBeenCalledTimes(1);

    unlisten1();
    await nvim.command('e!');
  });
});
