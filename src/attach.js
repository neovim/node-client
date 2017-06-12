const net = require('net');

const Neovim = require('./api/neovim');
const logger = require('./logger');

function attach({ reader: _reader, writer: _writer, proc, socket }) {
  let writer;
  let reader;

  if (socket) {
    const client = net.createConnection({ path: socket });
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
    const neovim = new Neovim({ logger });
    neovim.attachSession({
      writer,
      reader,
    });
    neovim.startSession();
    return neovim;
  }

  throw new Error('Invalid arguments, could not attach');
}

// 'default' export for ES2015 or TypeScript environment.
module.exports = attach;
module.exports.default = module.exports;
