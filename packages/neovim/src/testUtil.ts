import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
// eslint-disable-next-line import/no-extraneous-dependencies
import expect from 'expect';
import { NeovimClient } from './api/client';
import { attach } from './attach/attach';
import { findNvim } from './utils/findNvim';
import { getLogger } from './utils/logger';

export function findNvimOrFail() {
  const minVersion = '0.9.5';
  const found = findNvim({ minVersion });
  if (found.matches.length === 0) {
    throw new Error(`nvim ${minVersion} not found`);
  }
  return found.matches[0].path;
}

const nvimPath = findNvimOrFail();

// eslint-disable-next-line import/no-mutable-exports
export let proc: cp.ChildProcessWithoutNullStreams;
// eslint-disable-next-line import/no-mutable-exports
export let nvim: NeovimClient;

export function startNvim(): [cp.ChildProcessWithoutNullStreams, NeovimClient];
export function startNvim(doAttach: false): [cp.ChildProcessWithoutNullStreams, undefined];
export function startNvim(doAttach: true): [cp.ChildProcessWithoutNullStreams, NeovimClient];
export function startNvim(
  doAttach: boolean = true
): [cp.ChildProcessWithoutNullStreams, NeovimClient | undefined] {
  const testFile = expect.getState().testPath?.replace(/.*[\\/]/, '');
  const msg = `startNvim in test: ${testFile}`;
  if (process.env.NVIM_NODE_LOG_FILE) {
    const logfile = path.resolve(process.env.NVIM_NODE_LOG_FILE);
    fs.writeFileSync(logfile, `${msg}\n`, { flag: 'a' });
  }

  proc = cp.spawn(nvimPath, ['-u', 'NONE', '--embed', '-n', '--noplugin'], {
    cwd: __dirname,
  });
  if (!doAttach) {
    return [proc, undefined];
  }
  nvim = attach({ proc });
  return [proc, nvim];
}

export function stopNvim(proc_?: cp.ChildProcessWithoutNullStreams | NeovimClient) {
  // Stop all (proc + client).
  if (!proc_) {
    if (proc) {
      stopNvim(proc);
    }
    if (nvim) {
      stopNvim(nvim);
    }
    return;
  }

  if (proc_ instanceof NeovimClient) {
    proc_.quit();
  } else if (proc_ && proc_.connected) {
    proc_.disconnect();
  }
}

export function getFakeNvimClient() {
  return {
    logger: getLogger(),
  } as NeovimClient;
}
