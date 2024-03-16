import * as cp from 'node:child_process';
import { NeovimClient } from './api/client';
import { attach } from './attach';
import { findNvim } from './utils/findNvim';

export function startNvim(): [cp.ChildProcessWithoutNullStreams, NeovimClient]
export function startNvim(doAttach: false): [cp.ChildProcessWithoutNullStreams, undefined]
export function startNvim(doAttach: true): [cp.ChildProcessWithoutNullStreams, NeovimClient]
export function startNvim(
  doAttach: boolean = true
): [cp.ChildProcessWithoutNullStreams, NeovimClient | undefined] {
  const proc = cp.spawn('nvim', ['-u', 'NONE', '--embed', '-n', '--noplugin'], {
    cwd: __dirname,
  });
  if (!doAttach) {
    return [proc, undefined];
  }
  const nvim = attach({ proc });
  return [proc, nvim];
}

export function stopNvim(
  proc_: cp.ChildProcessWithoutNullStreams | NeovimClient
) {
  if (!proc_) {
    return;
  } else if (proc_ instanceof NeovimClient) {
    proc_.quit();
  } else if (proc_ && proc_.connected) {
    proc_.disconnect();
  }
}

export function findNvimOrFail() {
  const minVersion = '0.9.5';
  const found = findNvim({ minVersion });
  if (found.matches.length === 0) {
    throw new Error(`nvim ${minVersion} not found`);
  }
  return found.matches[0].path;
}
