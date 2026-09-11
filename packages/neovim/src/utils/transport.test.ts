import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import * as path from 'node:path';
import { PassThrough, Readable, Writable } from 'node:stream';
import * as msgpack from '@msgpack/msgpack';
import expect from 'expect';
import { attach } from '../attach/attach';
import { exportsForTesting } from './transport';

describe('transport', () => {
  it('throws on invalid RPC message', done => {
    const invalidPayload = { bogus: 'nonsense' };
    const onTransportFail: EventEmitter = exportsForTesting.onTransportFail;
    onTransportFail.on('fail', (errMsg: string) => {
      expect(errMsg).toEqual(
        "invalid msgpack-RPC message: expected array, got: { bogus: 'nonsense' }"
      );
      done();
    });

    // Create fake reader/writer and send a (broken) message.
    const fakeReader = new Readable({ read() {} });
    const fakeWriter = new Writable({ write() {} });

    const nvim = attach({ reader: fakeReader, writer: fakeWriter });
    void nvim; // eslint-disable-line no-void

    // Simulate an invalid message on the channel.
    const msg = msgpack.encode(invalidPayload);
    fakeReader.push(Buffer.from(msg.buffer, msg.byteOffset, msg.byteLength));
  });

  it('closes transport and cleans up pending requests', async () => {
    const socket = new PassThrough();

    const nvim = attach({ reader: socket, writer: socket });

    // Close the transport
    const closePromise = nvim.close();

    // Verify close promise resolves
    await expect(closePromise).resolves.toBeUndefined();
  });

  it('encodes when api/Buffer is loaded first', () => {
    // Needs a new process: this one has already loaded every module through the index.
    const script = [
      "require('./src/api/Buffer');",
      "const { Transport } = require('./src/utils/transport');",
      "new Transport().encodeToBuffer([1, 'x']);",
    ].join('\n');
    execFileSync(process.execPath, ['-r', 'ts-node/register', '-e', script], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, TS_NODE_TRANSPILE_ONLY: 'true' },
      stdio: 'pipe',
    });
  }).timeout(30000);
});
