#!/usr/bin/env node
const { Host } = require('../lib/host');
const { spawnSync } = require('child_process');

// node <current script> <rest of args>
const [, , ...args] = process.argv;

if (args[0] === '--version') {
  // eslint-disable-next-line global-require
  const pkg = require('../package.json');
  // eslint-disable-next-line no-console
  console.log(pkg.version);
  process.exit(0);
}

// "21.6.1" => "21"
const nodeMajorVersionStr = process.versions.node.replace(/\..*/, '')
const nodeMajorVersion = Number.parseInt(nodeMajorVersionStr ?? '0')

if (
  process.env.NVIM_NODE_HOST_DEBUG &&
  nodeMajorVersion >= 8 &&
  process.execArgv.every(token => token !== '--inspect-brk')
) {
  const childHost = spawnSync(
    process.execPath,
    process.execArgv.concat(['--inspect-brk']).concat(process.argv.slice(1)),
    { stdio: 'inherit' }
  );
  process.exit(childHost.status);
}

try {
  const host = new Host(args);
  host.start({ proc: process });
} catch (err) {
  process.stderr.write(`failed to start Nvim plugin host: ${err.name}: ${err.message}\n`);
}

process.on('unhandledRejection', (reason, p) => {
  process.stderr.write(`Unhandled Rejection at: ${p} reason: ${reason}\n`);
});
