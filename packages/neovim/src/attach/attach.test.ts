import assert from 'node:assert';
import sinon from 'sinon';
import { attach } from './attach';
import { Logger } from '../utils/logger';
import * as testUtil from '../testUtil';
import { NeovimClient } from '../api/client';

// global.expect = expect;

describe('Nvim API', () => {
  let proc: ReturnType<typeof testUtil.startNvim>[0];
  let nvim: ReturnType<typeof testUtil.startNvim>[1];

  /** Incoming requests (from Nvim). */
  const requests: { method: string; args: number[] }[] = [];
  /** Incoming notifications (from Nvim). */
  const notifications: { method: string; args: number[] }[] = [];

  before(async () => {
    [proc, nvim] = testUtil.startNvim();

    // Incoming requests (from Nvim).
    nvim.on('request', (method, args, resp) => {
      requests.push({ method, args });
      resp.send(`received ${method}(${args})`);
    });

    // Incoming notifications (from Nvim).
    nvim.on('notification', (method, args) => {
      notifications.push({ method, args });
    });
  });

  after(() => {
    testUtil.stopNvim();
  });

  beforeEach(() => {
    requests.length = 0;
    notifications.length = 0;
  });

  it('failure modes', async () => {
    const c = new NeovimClient();
    await assert.rejects(c.channelId, {
      message: 'channelId requested before _isReady',
    });
  });

  it('console.log is monkey-patched to logger.info #329', async () => {
    const spy = sinon.spy(nvim.logger, 'info');
    // eslint-disable-next-line no-console
    console.log('log message');
    // @ts-expect-error Sinon types are broken with overloads
    // see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/36436
    assert(spy.calledWith('log message'));
    // Still alive?
    assert.strictEqual(await nvim.eval('1+1'), 2);
  });

  it('console.assert is monkey-patched', async () => {
    const spy = sinon.spy(nvim.logger, 'error');
    // eslint-disable-next-line no-console
    console.assert(false, 'foo', 42, { x: [1, 2] });
    assert(
      // @ts-expect-error Sinon types are broken with overloads
      spy.calledWithExactly('assertion failed', 'foo', 42, {
        x: [1, 2],
      })
    );
    // Still alive?
    assert.strictEqual(await nvim.eval('1+1'), 2);
  });

  it('console.log NOT monkey-patched if custom logger passed to attach()', async () => {
    const [proc2] = testUtil.startNvim(false);
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
    const nvim2 = attach({
      proc: proc2,
      options: { logger: logger2 as Logger },
    });

    const spy = sinon.spy(nvim2.logger, 'info');
    // eslint-disable-next-line no-console
    console.log('message 1');
    // console.log was NOT patched.
    assert(spy.notCalled);
    // Custom logger did NOT get the message.
    assert.deepStrictEqual(logged, []);

    // Custom logger can be called explicitly.
    nvim2.logger.info('message 2');
    assert.deepStrictEqual(logged, ['message 2']);

    // Still alive?
    assert.strictEqual(await nvim2.eval('1+1'), 2);

    testUtil.stopNvim(nvim2);
  });

  it('noisy RPC traffic', async () => {
    let requestCount = 0;
    const oldRequest = nvim.request;
    nvim.request = function (
      this: any,
      name: string,
      args: any[] = []
    ): Promise<any> {
      requestCount = requestCount + 1;
      return oldRequest.call(this, name, args);
    };

    for (let i = 0; i < 99; i = i + 1) {
      nvim.command('noswapfile edit test-node-client.lua');
      nvim.command('bwipeout!');
    }

    assert.strictEqual(requestCount, 99 * 2);

    // Still alive?
    assert.strictEqual(await nvim.eval('1+1'), 2);

    nvim.request = oldRequest;
  });

  it('can send requests and receive response', async () => {
    const result = await nvim.eval('{"k1": "v1", "k2": 2}');
    assert.deepStrictEqual(result, { k1: 'v1', k2: 2 });
  });

  it('can receive requests and send responses', async () => {
    const res = await nvim.eval('rpcrequest(1, "request", 1, 2, 3)');
    assert.strictEqual(res, 'received request(1,2,3)');
    assert.deepStrictEqual(requests, [{ method: 'request', args: [1, 2, 3] }]);
    assert.deepStrictEqual(notifications, []);
  });

  it('can receive notifications', async () => {
    const res = await nvim.eval('rpcnotify(1, "notify", 1, 2, 3)');
    assert.strictEqual(res, 1);
    assert.deepStrictEqual(requests, []);
    return new Promise(resolve => {
      setImmediate(() => {
        assert.deepStrictEqual(notifications, [
          { method: 'notify', args: [1, 2, 3] },
        ]);
        resolve(undefined);
      });
    });
  });

  it('can deal with custom types', async () => {
    await nvim.command('vsp');
    await nvim.command('vsp');
    await nvim.command('vsp');
    const windows = await nvim.windows;

    assert.strictEqual(windows.length, 4);
    assert(windows[0] instanceof nvim.Window);
    assert(windows[1] instanceof nvim.Window);

    await nvim.setWindow(windows[2]);
    const win = await nvim.window;

    assert(!win.equals(windows[0]));
    assert(win.equals(windows[2]));

    const buf = await nvim.buffer;
    assert(buf instanceof nvim.Buffer);

    const lines = await buf.getLines({
      start: 0,
      end: -1,
      strictIndexing: true,
    });
    assert.deepStrictEqual(lines, ['']);

    buf.setLines(['line1', 'line2'], { start: 0, end: 1 });
    const newLines = await buf.getLines({
      start: 0,
      end: -1,
      strictIndexing: true,
    });
    assert.deepStrictEqual(newLines, ['line1', 'line2']);
  });

  // skip for now. #419
  it.skip('emits "disconnect" after quit', done => {
    const disconnectMock = sinon.spy();
    nvim.on('disconnect', disconnectMock);

    nvim.quit();

    // TODO: 'close' event sometimes does not emit. #414
    proc.on('exit', () => {
      assert.strictEqual(disconnectMock.callCount, 1);
      done();
    });

    // Event doesn't actually emit when we quit nvim, but when the child process is killed
    if (proc && proc.connected) {
      proc.disconnect();
    }
  });
});
