import * as cp from 'node:child_process';
import { NeovimClient } from './api/client';
import { attach } from './attach';

let proc: cp.ChildProcessWithoutNullStreams;
let nvim: NeovimClient;

/**
 * Gets the current Nvim client being used in the current test.
 */
export function getNvim(): NeovimClient {
  return nvim;
}

export function getNvimProc(): cp.ChildProcessWithoutNullStreams {
  return proc;
}

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
  if (proc_ instanceof NeovimClient) {
    proc_.quit();
  } else if (proc_ && proc_.connected) {
    proc_.disconnect();
  }
}

export function startNvim2(): void {
  [proc, nvim] = startNvim();
}

// TODO: use jest beforeAll/afterAll instead of requiring the tests to do this explicitly.
export function stopNvim2(): void {
  stopNvim(proc);
  stopNvim(nvim);
}

// beforeAll(async () => {
//   [proc, nvim] = testUtil.startNvim();
// });
