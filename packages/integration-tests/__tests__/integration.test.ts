/* eslint-env jest */
import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

import { NeovimClient, attach, findNvim } from 'neovim';

describe('Node host', () => {
  const testdir = process.cwd();
  let proc: cp.ChildProcessWithoutNullStreams;
  let args;
  let nvim: NeovimClient;

  beforeAll(async () => {
    const plugdir = path.resolve(__dirname);
    const nvimrc = path.join(plugdir, 'nvimrc');
    args = [
      '-u',
      nvimrc,
      '--headless',
      '-i',
      'NONE',
      '-c',
      'UpdateRemotePlugins',
      '-c',
      'q!',
    ];

    const integrationDir = path.resolve(plugdir, '..', '..', 'example-plugin');
    process.chdir(plugdir);

    fs.writeFileSync(
      nvimrc,
      `set rtp+=${integrationDir}
    let g:node_host_prog = '${path.resolve(plugdir, '../../neovim/bin/cli')}'
      `
    );

    const minVersion = '0.9.5';
    const nvimInfo = findNvim({ minVersion });
    const nvimPath = nvimInfo.matches[0]?.path;
    if (!nvimPath) {
      throw new Error(`nvim ${minVersion} not found`);
    }

    cp.spawnSync(nvimPath, args);

    proc = cp.spawn(
      nvimPath,
      ['-u', nvimrc, '-i', 'NONE', '--headless', '--embed', '-n'],
      {}
    );
    nvim = attach({ proc });
  });

  afterAll(() => {
    process.chdir(testdir);
    nvim.quit();
    if (proc && proc.connected) {
      proc.disconnect();
    }
  });

  beforeEach(() => {});

  afterEach(() => {});

  // it.skip('should return specs', async done => {
  // const proc = cp.spawn('nvim', args.concat(['--embed']));
  // const nvim = attach({ proc });
  // nvim.command('UpdateRemotePlugins');
  // done();
  // });

  it('console.log is monkey-patched to logger.info #329', async () => {
    const spy = jest.spyOn(nvim.logger, 'info');
    console.log('log message');
    expect(spy).toHaveBeenCalledWith('log message');
    // Still alive?
    expect(await nvim.eval('1+1')).toEqual(2);
  });

  it('can run a command from plugin', async () => {
    await nvim.command('JSHostTestCmd');
    const line = await nvim.line;
    expect(line).toEqual('A line, for your troubles');
  });

  it('can catch thrown errors from plugin', async () => {
    try {
      await nvim.command('JSHostTestCmd canhazresponse?');
      // Below should not be evaluated because above throws
      expect(true).toEqual(false);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('can call a function from plugin', async () => {
    const result = await nvim.callFunction('Func', []);
    expect(result).toEqual('Funcy ');
  });

  it('can call a function from plugin with args', async () => {
    const result = await nvim.callFunction('Func', ['args']);
    expect(result).toEqual('Funcy args');
  });

  it.skip('can call a function from plugin with args', async () => {
    await nvim.command('e! nvimrc');
  });

  it('spawns a child host if $NVIM_NODE_HOST_DEBUG is set', done => {
    const childHost = cp.spawn(
      process.execPath,
      [path.join(__dirname, '..', '..', 'neovim', 'bin', 'cli.js')],
      { env: { NVIM_NODE_HOST_DEBUG: 'TRUE' }, stdio: 'ignore' }
    );

    setTimeout(() => {
      http.get('http://127.0.0.1:9229/json/list', res => {
        let rawData = '';
        res.on('data', chunk => {
          rawData = rawData + chunk;
        });
        res.on('end', () => {
          try {
            const debugData = JSON.parse(rawData);
            childHost.kill();
            expect(Array.isArray(debugData) && debugData.length).toBeTruthy();
            expect(debugData[0].webSocketDebuggerUrl).toMatch(
              'ws://127.0.0.1:9229'
            );
            done();
          } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error(e.message);
            throw e;
          }
        });
      });
    }, 500);
  });
});
