import { createConnection } from 'node:net';
import * as child from 'node:child_process';

import { NeovimClient } from '../api/client';
import { Logger, getLogger } from '../utils/logger';

export interface Attach {
  reader?: NodeJS.ReadableStream;
  writer?: NodeJS.WritableStream;
  proc?: NodeJS.Process | child.ChildProcess;
  socket?: string;
  options?: {
    logger?: Logger;
  };
}

export function attach({
  reader: _reader,
  writer: _writer,
  proc,
  socket,
  options = {},
}: Attach) {
  let writer;
  let reader;

  if (socket) {
    const client = createConnection(socket);
    writer = client;
    reader = client;
  } else if (_reader && _writer) {
    writer = _writer;
    reader = _reader;
  } else if (proc) {
    writer = proc.stdin;
    reader = proc.stdout;
  }

  if (writer && reader) {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const loggerInstance = options.logger || getLogger(); // lazy load to winston only if needed
    const neovim = new NeovimClient({ logger: loggerInstance });
    neovim.attach({
      writer,
      reader,
    });
    return neovim;
  }
  throw new Error('Invalid arguments, could not attach');
}
