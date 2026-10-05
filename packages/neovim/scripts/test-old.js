/**
 * Exercises basic functionality, for Node versions too old to run the test tooling.
 *
 */

const assert = require('node:assert');
const cp = require('node:child_process');
const fs = require('node:fs');
const { attach, findNvim } = require('../');

// `attach()` monkey-patches `console` to avoid polluting the RPC channel, so write to fd
// 2 directly.
const report = msg => fs.writeSync(2, `${msg}\n`);

async function main() {
  const nvimPath = findNvim({ minVersion: '0.9.0' }).matches[0]?.path;
  assert.ok(nvimPath, 'no usable nvim found');

  const proc = cp.spawn(nvimPath, ['-u', 'NONE', '--embed', '-n', '--noplugin']);
  // Kill unconditionally: an unreaped Nvim keeps the event loop alive, which
  // would hang instead of failing.
  try {
    const nvim = attach({ proc });

    await nvim.command('let g:test_old = "ok"');
    assert.equal(await nvim.getVar('test_old'), 'ok');
    assert.equal((await nvim.buffers).length, 1);
    assert.match(await nvim.commandOutput('version'), /NVIM/);

    report(`test-old: ok (node ${process.version}, ${nvimPath})`);
  } finally {
    proc.kill();
  }
}

main().catch(err => {
  report(`test-old: FAILED\n${err && err.stack}`);
  process.exitCode = 1;
});
