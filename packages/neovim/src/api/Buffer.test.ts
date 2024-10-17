import assert from 'node:assert';
import sinon from 'sinon';
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
  function withBuffer(
    lines: string[],
    test: (buffer: Buffer) => Promise<void>
  ) {
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
      assert(buffer instanceof nvim.Buffer);
    })
  );

  it(
    'get bufnr by id',
    withBuffer([], async buffer => {
      const bufnr = await nvim.call('bufnr', ['%']);
      assert.strictEqual(buffer.id, bufnr);
    })
  );

  describe('Normal API calls', () => {
    it(
      'gets changedtick of buffer',
      withBuffer([], async buffer => {
        const initial = await buffer.changedtick;

        // insert a line
        buffer.append('hi');
        assert.strictEqual(await buffer.changedtick, initial + 1);

        // clear buffer
        buffer.remove(0, -1, false);
        assert.strictEqual(await buffer.changedtick, initial + 2);
      })
    );

    it('sets/gets the current buffer name', async () => {
      (await nvim.buffers)[0].name = 'hello.txt';
      const name = await (await nvim.buffers)[0].name;
      assert(name.match('hello.txt'));
    });

    it(
      'is a valid buffer',
      withBuffer([], async buffer => {
        assert.strictEqual(await buffer.valid, true);
      })
    );

    it(
      'sets current buffer name to "foo.txt"',
      withBuffer([], async buffer => {
        // eslint-disable-next-line no-param-reassign
        buffer.name = 'foo.txt';
        assert((await buffer.name).match('foo.txt'));

        // eslint-disable-next-line no-param-reassign
        buffer.name = 'test2.txt';
        assert((await buffer.name).match('test2.txt'));
      })
    );

    it(
      'can replace first line of buffer with a string',
      withBuffer(['foo'], async buffer => {
        buffer.replace('test', 0);
        assert.deepStrictEqual(await buffer.lines, ['test']);
      })
    );

    it(
      'can insert lines at beginning of buffer',
      withBuffer(['test'], async buffer => {
        await buffer.insert(['test', 'foo'], 0);
        assert.deepStrictEqual(await buffer.lines, ['test', 'foo', 'test']);
      })
    );

    it(
      'replaces the right lines',
      withBuffer(
        ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        async buffer => {
          await buffer.replace(['a', 'b', 'c'], 2);

          assert.deepStrictEqual(await buffer.lines, [
            '0',
            '1',
            'a',
            'b',
            'c',
            '5',
            '6',
            '7',
            '8',
            '9',
          ]);
        }
      )
    );

    it(
      'inserts line at index 2',
      withBuffer(['test', 'bar', 'bar', 'bar'], async buffer => {
        buffer.insert(['foo'], 2);
        assert.deepStrictEqual(await buffer.lines, [
          'test',
          'bar',
          'foo',
          'bar',
          'bar',
        ]);
      })
    );

    it(
      'removes last 2 lines',
      withBuffer(['test', 'bar', 'foo', 'a', 'b'], async buffer => {
        buffer.remove(-3, -1, true);
        assert.deepStrictEqual(await buffer.lines, ['test', 'bar', 'foo']);
      })
    );

    it('checks if buffer is loaded', async () => {
      await nvim.command('new');
      const buffer = await nvim.buffer;
      assert.strictEqual(await buffer.loaded, true);
      await nvim.command('bunload!');
      assert.strictEqual(await buffer.loaded, false);
    });

    it(
      'gets byte offset for a line',
      withBuffer(['test', 'bar', ''], async buffer => {
        assert.strictEqual(await buffer.getOffset(0), 0);
        assert.strictEqual(await buffer.getOffset(1), 5); // test\n
        assert.strictEqual(await buffer.getOffset(2), 9); // test\n + bar\n
        assert.strictEqual(await buffer.getOffset(3), 10); // test\n + bar\n + \n
        await assert.rejects(buffer.getOffset(4));
      })
    );

    it('returns -1 for byte offset of unloaded buffer', async () => {
      await nvim.command('new');
      await nvim.command('bunload!');
      const buffer = await nvim.buffer;
      assert.strictEqual(await buffer.getOffset(0), -1);
    });

    it(
      'append lines to end of buffer',
      withBuffer(['test', 'bar', 'foo'], async buffer => {
        await buffer.append(['test', 'test']);

        assert.deepStrictEqual(await buffer.lines, [
          'test',
          'bar',
          'foo',
          'test',
          'test',
        ]);
      })
    );

    it(
      'can clear the buffer',
      withBuffer(['foo'], async buffer => {
        buffer.remove(0, -1, true);
        // One empty line
        assert.strictEqual(await buffer.length, 1);
        assert.deepStrictEqual(await buffer.lines, ['']);
      })
    );

    it(
      'changes buffer options',
      withBuffer([], async buffer => {
        const initial = await buffer.getOption('copyindent');
        buffer.setOption('copyindent', true);
        assert.strictEqual(await buffer.getOption('copyindent'), true);
        buffer.setOption('copyindent', false);
        assert.strictEqual(await buffer.getOption('copyindent'), false);
        assert(initial !== undefined);
        // Restore option
        buffer.setOption('copyindent', initial);
        assert.strictEqual(await buffer.getOption('copyindent'), initial);
      })
    );

    it(
      'returns null if variable is not found',
      withBuffer([], async buffer => {
        const test = await buffer.getVar('test');
        assert.strictEqual(test, null);
      })
    );

    it(
      'can set and delete a b: variable to an object',
      withBuffer([], async buffer => {
        buffer.setVar('test', { foo: 'testValue' });

        assert.deepStrictEqual(await buffer.getVar('test'), {
          foo: 'testValue',
        });

        assert.deepStrictEqual(await nvim.eval('b:test'), { foo: 'testValue' });
        buffer.deleteVar('test');

        assert.strictEqual(await nvim.eval('exists("b:test")'), 0);

        assert.strictEqual(await buffer.getVar('test'), null);
      })
    );
    it('can get list of commands', async () => {
      assert.deepStrictEqual(await nvim.buffer.commands, {});
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
      assert((await nvim.buffer.name).match('goodbye.txt'));
    });

    it('can chain calls from Base class i.e. getOption', async () => {
      const buffer = await nvim.buffer;
      const initial = await buffer.getOption('copyindent');
      buffer.setOption('copyindent', true);
      assert.strictEqual(await buffer.getOption('copyindent'), true);
      buffer.setOption('copyindent', false);
      assert.strictEqual(await buffer.getOption('copyindent'), false);
      assert(initial !== undefined);
      // Restore option
      buffer.setOption('copyindent', initial);
      assert.strictEqual(await buffer.getOption('copyindent'), initial);
    });

    it('sets current buffer name to "bar.js" using api chaining', async () => {
      const buffer = await nvim.buffer;
      buffer.name = 'bar.js';
      assert((await buffer.name).match('bar.js'));

      buffer.name = 'test2.js';
      assert((await buffer.name).match('test2.js'));
    });

    it(
      'can replace first line of nvim.buffer with a string',
      withBuffer([], async () => {
        const buffer = await nvim.buffer;
        await buffer.replace('test', 0);
        assert.deepStrictEqual(await buffer.lines, ['test']);
      })
    );

    it(
      'replaces the right lines',
      withBuffer(
        ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        async () => {
          const buffer = await nvim.buffer;
          await buffer.replace(['a', 'b', 'c'], 2);

          assert.deepStrictEqual(await buffer.lines, [
            '0',
            '1',
            'a',
            'b',
            'c',
            '5',
            '6',
            '7',
            '8',
            '9',
          ]);
        }
      )
    );

    it(
      'can insert lines at beginning of buffer',
      withBuffer(['test'], async () => {
        const buffer = await nvim.buffer;
        await buffer.insert(['test', 'foo'], 0);
        assert.deepStrictEqual(await buffer.lines, ['test', 'foo', 'test']);
      })
    );

    it(
      'can replace nvim.buffer starting at line 1',
      withBuffer(['test', 'foo'], async () => {
        const buffer = await nvim.buffer;
        await buffer.replace(['bar', 'bar', 'bar'], 1);
        assert.deepStrictEqual(await buffer.lines, [
          'test',
          'bar',
          'bar',
          'bar',
        ]);
      })
    );

    it(
      'inserts line at index 2',
      withBuffer(['test', 'bar', 'bar', 'bar'], async () => {
        const buffer = await nvim.buffer;
        await buffer.insert(['foo'], 2);
        assert.deepStrictEqual(await buffer.lines, [
          'test',
          'bar',
          'foo',
          'bar',
          'bar',
        ]);
      })
    );

    it(
      'removes last 2 lines',
      withBuffer(['test', 'bar', 'foo', 'a', 'b'], async () => {
        const buffer = await nvim.buffer;
        await buffer.remove(-3, -1, true);
        assert.deepStrictEqual(await buffer.lines, ['test', 'bar', 'foo']);
      })
    );

    it(
      'append lines to end of buffer',
      withBuffer(['test', 'bar', 'foo'], async () => {
        const buffer = await nvim.buffer;
        await buffer.append(['test', 'test']);
        assert.deepStrictEqual(await buffer.lines, [
          'test',
          'bar',
          'foo',
          'test',
          'test',
        ]);
      })
    );

    it(
      'can clear the buffer',
      withBuffer(['foo'], async () => {
        const buffer = await nvim.buffer;
        await buffer.remove(0, -1, true);
        // One empty line
        assert.strictEqual(await buffer.length, 1);
        assert.deepStrictEqual(await buffer.lines, ['']);
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
    const mock = sinon.spy();
    const unlisten = buffer.listen('lines', mock);
    await buffer.insert(['bar'], 1);
    assert.strictEqual(mock.callCount, 1);
    unlisten();
    await buffer.insert(['bar'], 1);
    assert.strictEqual(mock.callCount, 1);
  });

  it('can reattach for buffer events', async () => {
    const buffer = await nvim.buffer;
    let unlisten = buffer.listen('lines', sinon.spy());
    unlisten();
    await wait(10);
    const mock = sinon.spy();
    unlisten = buffer.listen('lines', mock);
    await buffer.insert(['bar'], 1);
    assert.strictEqual(mock.callCount, 1);
    unlisten();
  });

  it('should return attached state', async () => {
    const buffer = await nvim.buffer;
    const unlisten = buffer.listen('lines', sinon.spy());
    await wait(30);
    let attached = buffer.isAttached;
    assert.strictEqual(attached, true);
    unlisten();
    await wait(30);
    attached = buffer.isAttached;
    assert.strictEqual(attached, false);
  });

  it('only bind once for the same event and handler', async () => {
    const buffer = await nvim.buffer;
    const mock = sinon.spy();
    buffer.listen('lines', mock);
    buffer.listen('lines', mock);
    await buffer.insert(['bar'], 1);
    assert.strictEqual(mock.callCount, 1);
  });

  it('can use `buffer.unlisten` to unlisten', async () => {
    const buffer = await nvim.buffer;
    const mock = sinon.spy();
    buffer.listen('lines', mock);
    await buffer.insert(['bar'], 1);
    assert.strictEqual(mock.callCount, 1);
    buffer.unlisten('lines', mock);
    await buffer.insert(['bar'], 1);
    assert.strictEqual(mock.callCount, 1);
  });

  it('listens to line updates', async () => {
    const buffer = await nvim.buffer;
    const bufferName = await buffer.name;
    await buffer.insert(['test', 'foo'], 0);

    const promise = new Promise<void>(resolve => {
      const unlisten = buffer.listen(
        'lines',
        async (
          currentBuffer: Buffer,
          tick: number,
          start: number,
          end: number,
          data: string[]
        ) => {
          assert.strictEqual(await currentBuffer.name, bufferName);
          assert.strictEqual(start, 1);
          assert.strictEqual(end, 1);
          assert.deepStrictEqual(data, ['bar']);
          unlisten();
          resolve();
        }
      );
    });

    await buffer.insert(['bar'], 1);
    await promise;
  });

  it('has listener on multiple buffers', async () => {
    await nvim.command('new!');
    const buffers = await nvim.buffers;
    const foo = sinon.spy();
    const bar = sinon.spy();

    buffers[0].listen('lines', foo);
    buffers[1].listen('lines', bar);

    await (await nvim.buffer).insert(['bar'], 1);
    assert.strictEqual(foo.callCount, 0);
    assert.strictEqual(bar.callCount, 1);
    await nvim.command('q!');

    await (await nvim.buffer).insert(['foo'], 0);
    assert.strictEqual(foo.callCount, 1);
    assert.strictEqual(bar.callCount, 1);

    buffers[0].unlisten('lines', foo);
    buffers[1].unlisten('lines', bar);
  });

  it('has multiple listeners for same event, on same buffer', async () => {
    await nvim.command('new!');

    const buffer = await nvim.buffer;
    const foo = sinon.spy();
    const bar = sinon.spy();

    const unlisten1 = buffer.listen('lines', foo);
    const unlisten2 = buffer.listen('lines', bar);

    await buffer.insert(['bar'], 1);
    assert.strictEqual(foo.callCount, 1);
    assert.strictEqual(bar.callCount, 1);

    unlisten2();

    await buffer.insert(['foo'], 0);
    assert.strictEqual(foo.callCount, 2);
    assert.strictEqual(bar.callCount, 1);

    unlisten1();
    await nvim.command('q!');
  });

  it('has multiple listeners for different events, on same buffer', async () => {
    await nvim.command('new!');

    const buffer = await nvim.buffer;
    const foo = sinon.spy();
    const bar = sinon.spy();

    const unlisten1 = buffer.listen('lines', foo);
    const unlisten2 = buffer.listen('changedtick', bar);

    await buffer.insert(['bar'], 1);
    assert.strictEqual(foo.callCount, 1);
    assert.strictEqual(bar.callCount, 1);

    unlisten2();

    await buffer.insert(['foo'], 0);
    assert.strictEqual(foo.callCount, 2);
    assert.strictEqual(bar.callCount, 1);

    unlisten1();
    await nvim.command('q!');
  });
});
