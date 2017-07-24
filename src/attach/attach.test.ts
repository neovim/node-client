/* eslint-env jest */
import * as cp from 'child_process';
// // eslint-disable-next-line import/no-extraneous-dependencies
import * as which from 'which';
import { attach } from './attach';

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

describe('Nvim Promise API', () => {
  let proc;
  let nvim;
  let requests;
  let notifications;

  beforeAll(async done => {
    try {
      proc = cp.spawn(
        'nvim',
        ['-u', 'NONE', '-N', '--embed', '-c', 'set noswapfile'],
        {
          cwd: __dirname,
        }
      );

      nvim = await attach({ proc });
      nvim.on('request', (method, args, resp) => {
        requests.push({ method, args });
        resp.send(`received ${method}(${args})`);
      });
      nvim.on('notification', (method, args) => {
        notifications.push({ method, args });
      });

      done();
    } catch (err) {
      console.log(err);
    }
  });

  afterAll(() => {
    nvim.quit();
    if (proc) {
      proc.disconnect();
    }
  });

  beforeEach(() => {
    requests = [];
    notifications = [];
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
    return new Promise(resolve =>
      setImmediate(() => {
        expect(notifications).toEqual([{ method: 'notify', args: [1, 2, 3] }]);
        resolve();
      })
    );
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

    const lines = await buf.getLines({ start: 0, end: -1 });
    expect(lines).toEqual(['']);

    buf.setLines(['line1', 'line2'], { start: 0, end: 1 });
    const newLines = await buf.getLines({ start: 0, end: -1 });
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
    if (typeof proc.disconnect === 'function') {
      proc.disconnect();
    }
  });
});
