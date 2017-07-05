import { createConnection } from 'net';
import * as child from 'child_process';

import { NeovimClient } from './../api/client';
import { logger } from '../utils/logger';

export interface Attach {
  reader?: NodeJS.ReadableStream;
  writer?: NodeJS.WritableStream;
  proc?: NodeJS.Process | child.ChildProcess;
  socket?: string;
}

export function attach({
  reader: _reader,
  writer: _writer,
  proc,
  socket,
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
    const neovim = new NeovimClient({ logger });
    neovim.attach({
      writer,
      reader,
    });
    return neovim;
  }
  throw new Error('Invalid arguments, could not attach');
}
