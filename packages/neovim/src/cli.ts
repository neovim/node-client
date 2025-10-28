import { spawnSync } from 'node:child_process';
import { attach } from './attach';

let nvim: ReturnType<typeof attach>;

// node <current script> <rest of args>
const [, , ...args] = process.argv;

if (args[0] === '--version') {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const pkg = require('../package.json');
  // eslint-disable-next-line no-console
  console.log(pkg.version);
  process.exit(0);
}

// "21.6.1" => "21"
const nodeMajorVersionStr = process.versions.node.replace(/\..*/, '');
const nodeMajorVersion = Number.parseInt(nodeMajorVersionStr ?? '0', 10);

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
  process.exit(childHost.status ?? undefined);
}

export interface Response {
  send(resp: any, isError?: boolean): void;
}

process.on('unhandledRejection', (reason, p) => {
  process.stderr.write(`Unhandled Rejection at: ${p} reason: ${reason}\n`);
});

/**
 * The "client" is also the "host". https://github.com/neovim/neovim/issues/27949
 */
async function handleRequest(method: string, args: any[], res: Response) {
  nvim.logger.debug('request received: %s', method);
  // 'poll' and 'specs' are requests from Nvim internals. Else we dispatch to registered remote module methods (if any).
  if (method === 'poll') {
    // Handshake for Nvim.
    res.send('ok');
    // } else if (method.startsWith('nvim_')) {
    //  // Let base class handle it.
    //  nvim.request(method, args);
  } else {
    const handler = nvim.handlers[method];
    if (!handler) {
      const msg = `node-client: missing handler for "${method}"`;
      nvim.logger.error(msg);
      res.send(msg, true);
    }

    try {
      nvim.logger.debug('found handler: %s: %O', method, handler);
      const plugResult = await handler(args, { name: method });
      res.send(
        !plugResult || typeof plugResult === 'undefined' ? null : plugResult
      );
    } catch (e) {
      const err = e as Error;
      const msg = `node-client: failed to handle request: "${method}": ${err.message}`;
      nvim.logger.error(msg);
      res.send(err.toString(), true);
    }
  }
}

// "The client *is* the host... The client *is* the host..."
//
// "Main" entrypoint for any Nvim remote plugin. It implements the Nvim remote
// plugin specification:
// - Attaches self to incoming RPC channel.
// - Responds to "poll" with "ok".
// - TODO: "specs"?
export function cli() {
  try {
    // Reverse stdio because it's from the perspective of Nvim.
    nvim = attach({ reader: process.stdin, writer: process.stdout });
    nvim.logger.debug('host.start');
    nvim.on('request', handleRequest);

    return nvim;
  } catch (e) {
    const err = e as Error;
    process.stderr.write(
      `failed to start Nvim plugin host: ${err.name}: ${err.message}\n`
    );

    return undefined;
  }
}
