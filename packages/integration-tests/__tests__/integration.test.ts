/* eslint-env jest */
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

import { attach } from 'neovim';

// eslint-disable-next-line
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;

describe('Node host', () => {
  const testdir = process.cwd();
  let proc;
  let args;
  let nvim;

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
    cp.spawnSync('nvim', args);

    proc = cp.spawn(
      'nvim',
      ['-u', nvimrc, '-i', 'NONE', '-N', '--headless', '--embed'],
      {}
    );
    nvim = await attach({ proc });
  });

  afterAll(() => {
    process.chdir(testdir);
    nvim.quit();
    proc.disconnect();
  });

  beforeEach(() => {});

  afterEach(() => {});

  // it.skip('should return specs', async done => {
  // const proc = cp.spawn('nvim', args.concat(['--embed']));
  // const nvim = await attach({ proc });
  // nvim.command('UpdateRemotePlugins');
  // done();
  // });

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

  it('spawns a child host if $NVIM_NODE_HOST_DEBUG is set', async done => {
    const childHost = cp.spawn(
      process.execPath,
      [path.join(__dirname, '..', 'bin', 'cli.js')],
      { env: { NVIM_NODE_HOST_DEBUG: 1 }, stdio: 'ignore' }
    );
    setTimeout(function() {
      http.get('http://127.0.0.1:9229/json/list', res => {
        let rawData = '';
        res.on('data', chunk => {
          rawData += chunk;
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
          } catch (e) {
            console.error(e.message);
            throw e;
          }
        });
      });
    }, 500);
  });
});
