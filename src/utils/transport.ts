/**
 * Some code borrowed from https://github.com/tarruda/node-msgpack5rpc
 */

import { EventEmitter } from 'events';

import * as msgpack from 'msgpack-lite';

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
    this.encoder.write(
      msgpack.encode([
        1,
        this.requestId,
        isError ? resp : null,
        !isError ? resp : null,
      ])
    );
    this.sent = true;
  }
}

class Transport extends EventEmitter {
  private pending: Map<number, Function> = new Map();
  private nextRequestId: number = 1;
  private encodeStream: any;
  private decodeStream: any;
  private reader: NodeJS.ReadableStream;
  private writer: NodeJS.WritableStream;
  protected codec: msgpack.Codec;

  constructor() {
    super();

    const codec = this.setupCodec();
    this.encodeStream = msgpack.createEncodeStream({ codec });
    this.decodeStream = msgpack.createDecodeStream({ codec });
    this.decodeStream.on('data', (msg: any[]) => {
      this.parseMessage(msg);
    });
    this.decodeStream.on('end', () => {
      this.detach();
      this.emit('detach');
    });
  }

  setupCodec() {
    const codec = msgpack.createCodec();

    Metadata.forEach(({ constructor }, id: number): void => {
      codec.addExtPacker(id, constructor, (obj: any) =>
        msgpack.encode(obj.data)
      );
      codec.addExtUnpacker(
        id,
        data =>
          new constructor({
            transport: this,
            data: msgpack.decode(data),
          })
      );
    });

    this.codec = codec;
    return this.codec;
  }

  attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream) {
    this.encodeStream = this.encodeStream.pipe(writer);
    reader.pipe(this.decodeStream);
    this.writer = writer;
    this.reader = reader;
  }

  detach() {
    this.encodeStream.unpipe(this.writer);
    this.reader.unpipe(this.decodeStream);
  }

  request(method: string, args: any[], cb: Function) {
    this.nextRequestId = this.nextRequestId + 1;
    this.encodeStream.write(
      msgpack.encode([0, this.nextRequestId, method, args], {
        codec: this.codec,
      })
    );
    this.pending.set(this.nextRequestId, cb);
  }

  notify(method: string, args: any[]) {
    this.encodeStream.write([2, method, args]);
  }

  parseMessage(msg: any[]) {
    var msg_type = msg[0];

    if (msg_type === 0) {
      // request
      //   - msg[1]: id
      //   - msg[2]: method name
      //   - msg[3]: arguments
      this.emit(
        'request',
        msg[2].toString(),
        msg[3],
        new Response(this.encodeStream, msg[1])
      );
    } else if (msg_type === 1) {
      // response to a previous request:
      //   - msg[1]: the id
      //   - msg[2]: error(if any)
      //   - msg[3]: result(if not errored)
      var id = msg[1];
      var handler = this.pending.get(id);
      this.pending.delete(id);
      handler(msg[2], msg[3]);
    } else if (msg_type === 2) {
      // notification/event
      //   - msg[1]: event name
      //   - msg[2]: arguments
      this.emit('notification', msg[1].toString(), msg[2]);
    } else {
      this.encodeStream.write([1, 0, 'Invalid message type', null]);
    }
  }
}

export { Transport };
