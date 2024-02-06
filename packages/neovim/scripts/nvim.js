/* eslint no-console:0 */

/**
 * Spawns an embedded neovim instance and returns Neovim API
 */

const cp = require('child_process');
const { attach } = require('../');
// const inspect = require('util').inspect;

module.exports = (async function () {
  let proc;
  let socket;

  if (process.env.NVIM) {
    // Nvim 0.8+ https://github.com/neovim/neovim/pull/11009
    socket = process.env.NVIM;
  } else if (process.env.NVIM_LISTEN_ADDRESS) {
    // Nvim 0.7 or older https://github.com/neovim/neovim/pull/11009
    socket = process.env.NVIM_LISTEN_ADDRESS;
  } else {
    proc = cp.spawn('nvim', ['-u', 'NONE', '--embed', '-n'], {
      cwd: __dirname,
    });
  }

  const nvim = attach({ proc, socket });
  return nvim;
})();
