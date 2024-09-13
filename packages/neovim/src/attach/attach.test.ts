/* eslint-env jest */
import { attach } from './attach';
import { Logger } from '../utils/logger';
import * as testUtil from '../testUtil';
import { NeovimClient } from '../api/client';

describe('Nvim API', () => {
  let proc: ReturnType<typeof testUtil.startNvim>[0];
  let nvim: ReturnType<typeof testUtil.startNvim>[1];
  let requests: { method: string; args: number[] }[];
  let notifications: { method: string; args: number[] }[];

  beforeAll(async () => {
    [proc, nvim] = testUtil.startNvim();

    nvim.on('request', (method, args, resp) => {
      requests.push({ method, args });
      resp.send(`received ${method}(${args})`);
    });
    nvim.on('notification', (method, args) => {
      notifications.push({ method, args });
    });
  });

  afterAll(() => {
    testUtil.stopNvim();
  });

  beforeEach(() => {
    requests = [];
    notifications = [];
  });

  it('failure modes', async () => {
    const c = new NeovimClient();
    await expect(c.channelId).rejects.toThrow(
      'channelId requested before _isReady'
    );
  });

  it('console.log is monkey-patched to logger.info #329', async () => {
    const spy = jest.spyOn(nvim.logger, 'info');
    // eslint-disable-next-line no-console
    console.log('log message');
    expect(spy).toHaveBeenCalledWith('log message');
    // Still alive?
    expect(await nvim.eval('1+1')).toEqual(2);
  });

  it('console.assert is monkey-patched', async () => {
    const spy = jest.spyOn(nvim.logger, 'error');
    // eslint-disable-next-line no-console
    console.assert(false, 'foo', 42, { x: [1, 2] });
    expect(spy).toHaveBeenCalledWith('assertion failed', 'foo', 42, {
      x: [1, 2],
    });
    // Still alive?
    expect(await nvim.eval('1+1')).toEqual(2);
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

    const spy = jest.spyOn(nvim2.logger, 'info');
    // eslint-disable-next-line no-console
    console.log('message 1');
    // console.log was NOT patched.
    expect(spy).toHaveBeenCalledTimes(0);
    // Custom logger did NOT get the message.
    expect(logged).toEqual([]);

    // Custom logger can be called explicitly.
    nvim2.logger.info('message 2');
    expect(logged).toEqual(['message 2']);

    // Still alive?
    expect(await nvim2.eval('1+1')).toEqual(2);

    testUtil.stopNvim(nvim2);
  });

  it('can send requests and receive response', async () => {
    const result = await nvim.eval('{"k1": "v1", "k2": 2}');
    expect(result).toEqual({ k1: 'v1', k2: 2 });
  });

  it('can receive requests and send responses', async () => {
    const res = await nvim.eval('rpcrequest(1, "request", 1, 2, 3)');
    expect(res).toEqual('received request(1,2,3)');
    expect(requests).toEqual([{ method: 'request', args: [1, 2, 3] }]);
    expect(notifications).toEqual([]);
  });

  it('can receive notifications', async () => {
    const res = await nvim.eval('rpcnotify(1, "notify", 1, 2, 3)');
    expect(res).toEqual(1);
    expect(requests).toEqual([]);
    return new Promise(resolve => {
      setImmediate(() => {
        expect(notifications).toEqual([{ method: 'notify', args: [1, 2, 3] }]);
        resolve(undefined);
      });
    });
  });

  it('can deal with custom types', async () => {
    await nvim.command('vsp');
    await nvim.command('vsp');
    await nvim.command('vsp');
    const windows = await nvim.windows;

    expect(windows.length).toEqual(4);
    expect(windows[0] instanceof nvim.Window).toEqual(true);
    expect(windows[1] instanceof nvim.Window).toEqual(true);

    await nvim.setWindow(windows[2]);
    const win = await nvim.window;

    expect(win.equals(windows[0])).toBe(false);
    expect(win.equals(windows[2])).toBe(true);

    const buf = await nvim.buffer;
    expect(buf instanceof nvim.Buffer).toEqual(true);

    const lines = await buf.getLines({
      start: 0,
      end: -1,
      strictIndexing: true,
    });
    expect(lines).toEqual([]);

    buf.setLines(['line1', 'line2'], { start: 0, end: 1 });
    const newLines = await buf.getLines({
      start: 0,
      end: -1,
      strictIndexing: true,
    });
    expect(newLines).toEqual(['line1', 'line2']);
  });

  it('emits "disconnect" after quit', done => {
    const disconnectMock = jest.fn();
    nvim.on('disconnect', disconnectMock);
    nvim.quit();

    proc.on('close', () => {
      expect(disconnectMock.mock.calls.length).toBe(1);
      done();
    });

    // Event doesn't actually emit when we quit nvim, but when the child process is killed
    if (proc && proc.connected) {
      proc.disconnect();
    }
  });
});
