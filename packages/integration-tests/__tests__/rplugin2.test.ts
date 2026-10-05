/* eslint-env jest */
import * as cp from 'child_process';
import * as path from 'path';

import { NeovimClient, attach, findNvim } from 'neovim';

/**
 * Runs a program and returns its output.
 */
async function run(cmd: string, args: string[]) {
  return new Promise<{ proc: ReturnType<typeof cp.spawn>, stdout: string, stderr: string}>((resolve, reject) => {
    const proc = cp.spawn(cmd, args, { shell: false });
    const rv = {
      proc: proc,
      stdout: '',
      stderr: '',
    }

    proc.stdout.on('data', (data) => {
      rv.stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      rv.stderr += data.toString();
    });

    proc.on('exit', (code_) => {
      resolve(rv);
    });

    proc.on('error', (e) => {
      reject(e);
    });
  });
}

describe('Node host2', () => {
  const thisDir = path.resolve(__dirname);
  const pluginDir = path.resolve(thisDir, '../../example-plugin2/');
  const pluginMain = path.resolve(pluginDir, 'index.js').replace(/\\/g, '/');

  const testdir = process.cwd();
  let nvimProc: ReturnType<typeof cp.spawn>;
  let nvim: NeovimClient;

  beforeAll(async () => {
    const minVersion = '0.9.5'
    const nvimInfo = findNvim({ minVersion: minVersion });
    const nvimPath = nvimInfo.matches[0]?.path;
    if (!nvimPath) {
      throw new Error(`nvim ${minVersion} not found`)
    }

    nvimProc = cp.spawn(nvimPath, ['--clean', '-n', '--headless', '--embed'], {});
    nvim = attach({ proc: nvimProc });
  });

  afterAll(() => {
    process.chdir(testdir);
    nvim.quit();
    if (nvimProc && nvimProc.connected) {
      nvimProc.disconnect();
    }
  });

  beforeEach(() => {});

  afterEach(() => {});


  /**
   * From the Nvim process, starts a new "node …/plugin/index.js" RPC job (that
   * is, a node "plugin host", aka an Nvim node client).
   */
  async function newPluginChan() {
    const nodePath = process.argv0.replace(/\\/g, '/');
    const luacode = `
      -- "node …/plugin/index.js"
      local argv = { [[${nodePath}]], [[${pluginMain}]] }
      local chan = vim.fn.jobstart(argv, { rpc = true, stderr_buffered = true })
      return chan
    `
    return await nvim.lua(luacode);
  }

  it('`node plugin.js --version` prints node-client version', async () => {
    //process.chdir(thisDir);
    const proc = await run(process.argv0, [pluginMain, '--version']);
    // "5.1.1-dev.0\n"
    expect(proc.stdout).toMatch(/\d+\.\d+\.\d+/);

    proc.proc.kill('SIGKILL');
  });

  it('responds to "poll" with "ok"', async () => {
    // See also the old provider#Poll() function.

    // From Nvim, start an "node …/plugin/index.js" RPC job.
    // Then use that channel to call methods on the remote plugin.
    const chan = await newPluginChan();
    const rv = await nvim.lua(`return vim.rpcrequest(..., 'poll')`, [ chan ]);

    expect(rv).toEqual('ok');
  });

  //it('responds to "nvim_xx" methods', async () => {
  //  // This is just a happy accident of the fact that Nvim plugin host === client.
  //  const chan = await newPluginChan();
  //  const rv = await nvim.lua(`return vim.rpcrequest(..., 'nvim_eval', '1 + 3')`, [ chan ]);
  //  expect(rv).toEqual(3);
  //});

  it('responds to custom, plugin-defined methods', async () => {
    const chan = await newPluginChan();
    // The "testMethod1" function is defined in …/example-plugin2/index.js.
    const rv = await nvim.lua(`return vim.rpcrequest(..., 'testMethod1', {})`, [ chan ]);

    expect(rv).toEqual('called hostTest');
  });

  // TODO
  //it('Lua plugin can define autocmds/functions that call the remote plugin', async () => {
  //  // JSHostTestCmd
  //  // BufEnter
  //});
});

