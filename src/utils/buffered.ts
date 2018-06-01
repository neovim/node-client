import { Transform } from 'stream';

const MIN_SIZE = 8 * 1024;

export default class Buffered extends Transform {
  private chunks: Buffer[] | null;
  private timer: number | null;
  constructor() {
    super({
      readableHighWaterMark: 10 * 1024 * 1024,
      writableHighWaterMark: 10 * 1024 * 1024,
    } as any);
    this.chunks = null;
    this.timer = null
  }

  sendData() {
    let { chunks } = this;
    if (chunks) {
      this.chunks = null;
      let buf = Buffer.concat(chunks);
      this.push(buf);
    }
  }

  _transform(chunk: Buffer, encoding: any, callback: any) {
    let { chunks, timer } = this;
    if (timer) clearTimeout(timer)
    if (chunk.length < MIN_SIZE) {
      if (!chunks) return callback(null, chunk);
      chunks.push(chunk);
      this.sendData();
      callback();
      return;
    }
    if (!chunks) {
      chunks = this.chunks = [chunk];
    } else {
      chunks.push(chunk);
    }
    this.timer = setTimeout(this.sendData.bind(this), 20);
    callback();
  }

  _flush(callback: any) {
    let { chunks } = this;
    if (chunks) {
      this.chunks = null;
      let buf = Buffer.concat(chunks);
      callback(null, buf);
    } else {
      callback();
    }
  }
}
