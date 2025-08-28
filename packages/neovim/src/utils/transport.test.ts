import { EventEmitter } from 'node:events';
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
});
