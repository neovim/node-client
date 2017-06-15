/* eslint-env jest */
const cp = require('child_process');
// eslint-disable-next-line import/no-extraneous-dependencies
const which = require('which');
const attach = require('./attach');

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
    proc = cp.spawn('nvim', ['-u', 'NONE', '-N', '--embed', '-c', 'set noswapfile'], {
      cwd: __dirname,
    });

    nvim = await attach({ proc });
    nvim.on('request', (method, args, resp) => {
      requests.push({ method, args });
      resp.send(`received ${method}(${args})`);
    });
    nvim.on('notification', (method, args) => {
      notifications.push({ method, args });
    });
    await nvim.apiPromise;

    done();
  });

  afterAll(() => {
    if (proc) {
      proc.kill();
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
    const windows = await nvim.listWins();

    expect(windows.length).toEqual(4);
    expect(windows[0] instanceof nvim.Window).toEqual(true);
    expect(windows[1] instanceof nvim.Window).toEqual(true);

    await nvim.setCurrentWin(windows[2]);
    const win = await nvim.getCurrentWin();

    expect(win).not.toEqual(windows[0]);
    expect(win).toEqual(windows[2]);

    const buf = await nvim.getCurrentBuf();
    expect(buf instanceof nvim.Buffer).toEqual(true);

    const lines = await buf.getLines(0, -1, true);
    expect(lines).toEqual(['']);

    await buf.setLines(0, -1, true, ['line1', 'line2']);
    const newLines = await buf.getLines(0, -1, true);
    expect(newLines).toEqual(['line1', 'line2']);
  });

  it.only('uses new static API', async () => {
    await nvim.command('edit test.js');
    const buffer = await nvim.buffer;
    expect(buffer).toBeInstanceOf(nvim.Buffer);

    const name = await buffer.name;
    expect(name).toMatch('test.js');

    expect(await nvim.buffer.name).toMatch('test.js');
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
    proc.kill();
  });
});
