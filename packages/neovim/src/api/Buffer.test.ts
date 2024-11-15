import assert from 'node:assert';
import { expect } from 'expect';
import * as jestMock from 'jest-mock';
import * as testUtil from '../testUtil';
import type { Buffer } from './Buffer';

function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

describe('Buffer API', () => {
  let nvim: ReturnType<typeof testUtil.startNvim>[1];

  // utility to allow each test to be run in its
  // own buffer
  function withBuffer(lines: string[], test: (buffer: Buffer) => Promise<void>) {
    return async () => {
      await nvim.command('new!');

      const buffer = await nvim.buffer;

      if (lines) {
        await buffer.replace(lines, 0);
      }

      await test(buffer);

      await nvim.command(`bd! ${buffer.id}`);
    };
  }

  before(async () => {
    [, nvim] = testUtil.startNvim();
  });

  after(() => {
    testUtil.stopNvim();
  });

  it(
    'gets the current buffer',
    withBuffer([], async buffer => {
      expect(buffer).toBeInstanceOf(nvim.Buffer);
    })
  );

  it(
    'get bufnr by id',
    withBuffer([], async buffer => {
      const bufnr = await nvim.call('bufnr', ['%']);
      expect(buffer.id).toBe(bufnr);
    })
  );

  describe('Normal API calls', () => {
    it(
      'gets changedtick of buffer',
      withBuffer([], async buffer => {
        const initial = await buffer.changedtick;

        // insert a line
        buffer.append('hi');
        expect(await buffer.changedtick).toBe(initial + 1);

        // clear buffer
        buffer.remove(0, -1, false);
        expect(await buffer.changedtick).toBe(initial + 2);
      })
    );

    it('sets/gets the current buffer name', async () => {
      (await nvim.buffers)[0].name = 'hello.txt';
      const name = await (await nvim.buffers)[0].name;
      expect(name).toMatch('hello.txt');
    });

    it(
      'is a valid buffer',
      withBuffer([], async buffer => {
        expect(await buffer.valid).toBe(true);
      })
    );

    it(
      'sets current buffer name to "foo.txt"',
      withBuffer([], async buffer => {
        // eslint-disable-next-line no-param-reassign
        buffer.name = 'foo.txt';
        expect(await buffer.name).toMatch('foo.txt');
        // eslint-disable-next-line no-param-reassign
        buffer.name = 'test2.txt';
        expect(await buffer.name).toMatch('test2.txt');
      })
    );

    it(
      'can replace first line of buffer with a string',
      withBuffer(['foo'], async buffer => {
        buffer.replace('test', 0);
        expect(await buffer.lines).toEqual(['test']);
      })
    );

    it(
      'can insert lines at beginning of buffer',
      withBuffer(['test'], async buffer => {
        await buffer.insert(['test', 'foo'], 0);
        expect(await buffer.lines).toEqual(['test', 'foo', 'test']);
      })
    );

    it(
      'replaces the right lines',
      withBuffer(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], async buffer => {
        await buffer.replace(['a', 'b', 'c'], 2);

        expect(await buffer.lines).toEqual(['0', '1', 'a', 'b', 'c', '5', '6', '7', '8', '9']);
      })
    );

    it(
      'inserts line at index 2',
      withBuffer(['test', 'bar', 'bar', 'bar'], async buffer => {
        buffer.insert(['foo'], 2);
        expect(await buffer.lines).toEqual(['test', 'bar', 'foo', 'bar', 'bar']);
      })
    );

    it(
      'removes last 2 lines',
      withBuffer(['test', 'bar', 'foo', 'a', 'b'], async buffer => {
        buffer.remove(-3, -1, true);
        expect(await buffer.lines).toEqual(['test', 'bar', 'foo']);
      })
    );

    it('checks if buffer is loaded', async () => {
      await nvim.command('new');
      const buffer = await nvim.buffer;
      expect(await buffer.loaded).toBe(true);
      await nvim.command('bunload!');
      expect(await buffer.loaded).toBe(false);
    });

    it(
      'gets byte offset for a line',
      withBuffer(['test', 'bar', ''], async buffer => {
        expect(await buffer.getOffset(0)).toEqual(0);
        expect(await buffer.getOffset(1)).toEqual(5); // test\n
        expect(await buffer.getOffset(2)).toEqual(9); // test\n + bar\n
        expect(await buffer.getOffset(3)).toEqual(10); // test\n + bar\n + \n
        expect(buffer.getOffset(4)).rejects.toThrow();
      })
    );

    it('returns -1 for byte offset of unloaded buffer', async () => {
      await nvim.command('new');
      await nvim.command('bunload!');
      const buffer = await nvim.buffer;
      expect(await buffer.getOffset(0)).toEqual(-1);
    });

    it(
      'append lines to end of buffer',
      withBuffer(['test', 'bar', 'foo'], async buffer => {
        await buffer.append(['test', 'test']);

        expect(await buffer.lines).toEqual(['test', 'bar', 'foo', 'test', 'test']);
      })
    );

    it(
      'can clear the buffer',
      withBuffer(['foo'], async buffer => {
        buffer.remove(0, -1, true);
        // One empty line
        expect(await buffer.length).toEqual(1);
        expect(await buffer.lines).toEqual(['']);
      })
    );

    it(
      'changes buffer options',
      withBuffer([], async buffer => {
        const initial = await buffer.getOption('copyindent');
        buffer.setOption('copyindent', true);
        expect(await buffer.getOption('copyindent')).toBe(true);
        buffer.setOption('copyindent', false);
        expect(await buffer.getOption('copyindent')).toBe(false);
        assert(initial !== undefined);
        // Restore option
        buffer.setOption('copyindent', initial);
        expect(await buffer.getOption('copyindent')).toBe(initial);
      })
    );

    it(
      'returns null if variable is not found',
      withBuffer([], async buffer => {
        const test = await buffer.getVar('test');
        expect(test).toBe(null);
      })
    );

    it(
      'can set and delete a b: variable to an object',
      withBuffer([], async buffer => {
        buffer.setVar('test', { foo: 'testValue' });

        expect(await buffer.getVar('test')).toEqual({ foo: 'testValue' });

        expect(await nvim.eval('b:test')).toEqual({ foo: 'testValue' });
        buffer.deleteVar('test');

        expect(await nvim.eval('exists("b:test")')).toBe(0);

        expect(await buffer.getVar('test')).toBe(null);
      })
    );

    it('can get list of commands', async () => {
      expect(await nvim.buffer.commands).toEqual({});
    });

    it(
      'sets virtual text and clears namespace',
      withBuffer(['test'], async buffer => {
        const ns = await nvim.createNamespace();
        await buffer.setVirtualText(ns, 0, [['annotation', '']]);
        await buffer.clearNamespace({ nsId: ns });
      })
    );

    // TODO: How do we run integration tests for add/clear highlights? and get mark
  });

  describe('Chainable API calls', () => {
    it('sets/gets the current buffer name using api chaining', async () => {
      const buffer = await nvim.buffer;
      buffer.name = 'goodbye.txt';
      expect(await nvim.buffer.name).toMatch('goodbye.txt');
    });

    it('can chain calls from Base class i.e. getOption', async () => {
      const buffer = await nvim.buffer;
      const initial = await buffer.getOption('copyindent');
      buffer.setOption('copyindent', true);
      expect(await buffer.getOption('copyindent')).toBe(true);
      buffer.setOption('copyindent', false);
      expect(await buffer.getOption('copyindent')).toBe(false);
      assert(initial !== undefined);
      // Restore option
      buffer.setOption('copyindent', initial);
      expect(await buffer.getOption('copyindent')).toBe(initial);
    });

    it('sets current buffer name to "bar.js" using api chaining', async () => {
      const buffer = await nvim.buffer;
      buffer.name = 'bar.js';
      expect(await buffer.name).toMatch('bar.js');

      buffer.name = 'test2.js';
      expect(await buffer.name).toMatch('test2.js');
    });

    it(
      'can replace first line of nvim.buffer with a string',
      withBuffer([], async () => {
        const buffer = await nvim.buffer;
        await buffer.replace('test', 0);
        expect(await buffer.lines).toEqual(['test']);
      })
    );

    it(
      'replaces the right lines',
      withBuffer(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], async () => {
        const buffer = await nvim.buffer;
        await buffer.replace(['a', 'b', 'c'], 2);

        expect(await buffer.lines).toEqual(['0', '1', 'a', 'b', 'c', '5', '6', '7', '8', '9']);
      })
    );

    it(
      'can insert lines at beginning of buffer',
      withBuffer(['test'], async () => {
        const buffer = await nvim.buffer;
        await buffer.insert(['test', 'foo'], 0);
        expect(await buffer.lines).toEqual(['test', 'foo', 'test']);
      })
    );

    it(
      'can replace nvim.buffer starting at line 1',
      withBuffer(['test', 'foo'], async () => {
        const buffer = await nvim.buffer;
        await buffer.replace(['bar', 'bar', 'bar'], 1);
        expect(await buffer.lines).toEqual(['test', 'bar', 'bar', 'bar']);
      })
    );

    it(
      'inserts line at index 2',
      withBuffer(['test', 'bar', 'bar', 'bar'], async () => {
        const buffer = await nvim.buffer;
        await buffer.insert(['foo'], 2);
        expect(await buffer.lines).toEqual(['test', 'bar', 'foo', 'bar', 'bar']);
      })
    );

    it(
      'removes last 2 lines',
      withBuffer(['test', 'bar', 'foo', 'a', 'b'], async () => {
        const buffer = await nvim.buffer;
        await buffer.remove(-3, -1, true);
        expect(await buffer.lines).toEqual(['test', 'bar', 'foo']);
      })
    );

    it(
      'append lines to end of buffer',
      withBuffer(['test', 'bar', 'foo'], async () => {
        const buffer = await nvim.buffer;
        await buffer.append(['test', 'test']);
        expect(await buffer.lines).toEqual(['test', 'bar', 'foo', 'test', 'test']);
      })
    );

    it(
      'can clear the buffer',
      withBuffer(['foo'], async () => {
        const buffer = await nvim.buffer;
        await buffer.remove(0, -1, true);
        // One empty line
        expect(await buffer.length).toEqual(1);
        expect(await buffer.lines).toEqual(['']);
      })
    );
  });
});

describe('Buffer event updates', () => {
  let nvim: ReturnType<typeof testUtil.startNvim>[1];

  before(async () => {
    [, nvim] = testUtil.startNvim();
  });

  after(() => {
    testUtil.stopNvim();
  });

  beforeEach(async () => {
    await (await nvim.buffer).remove(0, -1, true);
  });

  it('can listen and unlisten', async () => {
    const buffer = await nvim.buffer;
    const mock = jestMock.fn();
    const unlisten = buffer.listen('lines', mock);
    await buffer.insert(['bar'], 1);
    expect(mock).toHaveBeenCalledTimes(1);
    unlisten();
    await buffer.insert(['bar'], 1);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('can reattach for buffer events', async () => {
    const buffer = await nvim.buffer;
    let unlisten = buffer.listen('lines', jestMock.fn());
    unlisten();
    await wait(10);
    const mock = jestMock.fn();
    unlisten = buffer.listen('lines', mock);
    await buffer.insert(['bar'], 1);
    expect(mock).toHaveBeenCalledTimes(1);
    unlisten();
  });

  it('should return attached state', async () => {
    const buffer = await nvim.buffer;
    const unlisten = buffer.listen('lines', jestMock.fn());
    await wait(30);
    let attached = buffer.isAttached;
    expect(attached).toBe(true);
    unlisten();
    await wait(30);
    attached = buffer.isAttached;
    expect(attached).toBe(false);
  });

  it('only bind once for the same event and handler ', async () => {
    const buffer = await nvim.buffer;
    const mock = jestMock.fn();
    buffer.listen('lines', mock);
    buffer.listen('lines', mock);
    await buffer.insert(['bar'], 1);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('can use `buffer.unlisten` to unlisten', async () => {
    const buffer = await nvim.buffer;
    const mock = jestMock.fn();
    buffer.listen('lines', mock);
    await buffer.insert(['bar'], 1);
    expect(mock).toHaveBeenCalledTimes(1);
    buffer.unlisten('lines', mock);
    await buffer.insert(['bar'], 1);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('listens to line updates', async () => {
    const buffer = await nvim.buffer;
    const bufferName = await buffer.name;
    await buffer.insert(['test', 'foo'], 0);

    const promise = new Promise<void>(resolve => {
      const unlisten = buffer.listen(
        'lines',
        async (currentBuffer: Buffer, tick: number, start: number, end: number, data: string[]) => {
          expect(await currentBuffer.name).toBe(bufferName);
          expect(start).toBe(1);
          expect(end).toBe(1);
          expect(data).toEqual(['bar']);
          unlisten();
          resolve();
        }
      );
    });

    await buffer.insert(['bar'], 1);
    await promise;
  });

  it('has listener on multiple buffers ', async () => {
    await nvim.command('new!');
    const buffers = await nvim.buffers;
    const foo = jestMock.fn();
    const bar = jestMock.fn();

    buffers[0].listen('lines', foo);
    buffers[1].listen('lines', bar);

    await (await nvim.buffer).insert(['bar'], 1);
    expect(foo).toHaveBeenCalledTimes(0);
    expect(bar).toHaveBeenCalledTimes(1);
    await nvim.command('q!');

    await (await nvim.buffer).insert(['foo'], 0);
    expect(foo).toHaveBeenCalledTimes(1);
    expect(bar).toHaveBeenCalledTimes(1);

    buffers[0].unlisten('lines', foo);
    buffers[1].unlisten('lines', bar);
  });

  it('has multiple listeners for same event, on same buffer', async () => {
    await nvim.command('new!');

    const buffer = await nvim.buffer;
    const foo = jestMock.fn();
    const bar = jestMock.fn();

    const unlisten1 = buffer.listen('lines', foo);
    const unlisten2 = buffer.listen('lines', bar);

    await buffer.insert(['bar'], 1);
    expect(foo).toHaveBeenCalledTimes(1);
    expect(bar).toHaveBeenCalledTimes(1);

    unlisten2();

    await buffer.insert(['foo'], 0);
    expect(foo).toHaveBeenCalledTimes(2);
    expect(bar).toHaveBeenCalledTimes(1);

    unlisten1();
    await nvim.command('q!');
  });

  it('has multiple listeners for different events, on same buffer', async () => {
    await nvim.command('new!');

    const buffer = await nvim.buffer;
    const foo = jestMock.fn();
    const bar = jestMock.fn();

    const unlisten1 = buffer.listen('lines', foo);
    const unlisten2 = buffer.listen('changedtick', bar);

    await buffer.insert(['bar'], 1);
    expect(foo).toHaveBeenCalledTimes(1);
    expect(bar).toHaveBeenCalledTimes(1);

    unlisten2();

    await buffer.insert(['foo'], 0);
    expect(foo).toHaveBeenCalledTimes(2);
    expect(bar).toHaveBeenCalledTimes(1);

    unlisten1();
    await nvim.command('q!');
  });
});
