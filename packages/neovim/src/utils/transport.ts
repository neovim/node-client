/**
 * Some code borrowed from https://github.com/tarruda/node-msgpack5rpc
 */

import { EventEmitter } from 'events';

import { encode, decode, ExtensionCodec, decodeStream } from '@msgpack/msgpack';
import { Metadata } from '../api/types';

class Response {
  private requestId: number;

  private sent: boolean;

  private encoder: NodeJS.WritableStream;

  constructor(encoder: NodeJS.WritableStream, requestId: number) {
    this.encoder = encoder;
    this.requestId = requestId;
  }

  send(resp: any, isError?: boolean): void {
    if (this.sent) {
      throw new Error(`Response to id ${this.requestId} already sent`);
    }

    const encoded = encode([
      1,
      this.requestId,
      isError ? resp : null,
      !isError ? resp : null,
    ]);

    this.encoder.write(
      Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength)
    );
    this.sent = true;
  }
}

class Transport extends EventEmitter {
  private pending: Map<number, Function> = new Map();

  private nextRequestId = 1;

  private reader: NodeJS.ReadableStream;

  private writer: NodeJS.WritableStream;

  private readonly extensionCodec: ExtensionCodec =
    this.initializeExtensionCodec();

  // Neovim client that holds state
  private client: any;

  private initializeExtensionCodec() {
    const codec = new ExtensionCodec();

    Metadata.forEach(({ constructor }, id: number): void => {
      codec.register({
        type: id,
        encode: (input: any) => {
          if (input instanceof constructor) {
            return encode(input.data);
          }
          return null;
        },
        decode: data =>
          new constructor({
            transport: this,
            client: this.client,
            data: decode(data),
          }),
      });
    });

    return codec;
  }

  private encodeToBuffer(value: unknown) {
    const encoded = encode(value, { extensionCodec: this.extensionCodec });
    return Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength);
  }

  attach(
    writer: NodeJS.WritableStream,
    reader: NodeJS.ReadableStream,
    client: any
  ) {
    this.writer = writer;
    this.reader = reader;
    this.client = client;

    this.reader.on('end', () => {
      this.emit('detach');
    });

    const asyncDecodeGenerator = decodeStream(this.reader as any, {
      extensionCodec: this.extensionCodec,
    });

    // naively iterate async generator created via decodeStream.
    // when runtime / polyfill allows replace to `for await (const val of asyncDecodeGenerator)`
    // syntax instead.
    const resolveGeneratorRecursively = (iter: AsyncGenerator) => {
      iter.next().then(resolved => {
        if (!resolved.done) {
          this.parseMessage(resolved.value);
          return resolveGeneratorRecursively(iter);
        }
        return Promise.resolve();
      });
    };

    resolveGeneratorRecursively(asyncDecodeGenerator);
  }

  request(method: string, args: any[], cb: Function) {
    this.nextRequestId = this.nextRequestId + 1;
    this.writer.write(
      this.encodeToBuffer([0, this.nextRequestId, method, args])
    );

    this.pending.set(this.nextRequestId, cb);
  }

  notify(method: string, args: any[]) {
    this.writer.write(this.encodeToBuffer([2, method, args]));
  }

  parseMessage(msg: any[]) {
    const msgType = msg[0];

    if (msgType === 0) {
      // request
      //   - msg[1]: id
      //   - msg[2]: method name
      //   - msg[3]: arguments
      this.emit(
        'request',
        msg[2].toString(),
        msg[3],
        new Response(this.writer, msg[1])
      );
    } else if (msgType === 1) {
      // response to a previous request:
      //   - msg[1]: the id
      //   - msg[2]: error(if any)
      //   - msg[3]: result(if not errored)
      const id = msg[1];
      const handler = this.pending.get(id);
      this.pending.delete(id);
      handler(msg[2], msg[3]);
    } else if (msgType === 2) {
      // notification/event
      //   - msg[1]: event name
      //   - msg[2]: arguments
      this.emit('notification', msg[1].toString(), msg[2]);
    } else {
      this.writer.write(
        this.encodeToBuffer([1, 0, 'Invalid message type', null])
      );
    }
  }
}

export { Transport };
