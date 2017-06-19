import { NeovimClient } from './../api/client';
import { createConnection } from 'net';
// const logger = require('./logger');

export function attach(_reader?, _writer?, proc?, socket?) {
  let writer;
  let reader;

  if (socket) {
    const client = createConnection(socket)
    writer = client;
    reader = client;
  } else if (_reader && _writer) {
    writer = _writer;
    reader = _reader;
  } else {
    writer = proc.stdin;
    reader = proc.stdout;
  }

  if (writer && reader) {
    const neovim = new NeovimClient();
    // const neovim = new NeovimClient(logger);
    neovim.attachSession({
      writer,
      reader,
    });
    return neovim;
  }
  throw new Error('Invalid arguments, could not attach');
}
