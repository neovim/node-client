/**
 * Handles attaching transport
 */
import { logger } from '../utils/logger';
import { Transport } from '../utils/transport';
import { VimValue } from '../types/VimValue';
import { Neovim } from './Neovim';
import { Buffer } from './Buffer';

const REGEX_BUF_EVENT = /nvim_buf_(.*)_event/;

export class NeovimClient extends Neovim {
  protected requestQueue: any[];

  private transportAttached: boolean;

  private _channelId: number;

  private attachedBuffers: Map<string, Map<string, Function[]>> = new Map();

  constructor(options: { transport?: Transport; logger?: typeof logger } = {}) {
    // Neovim has no `data` or `metadata`
    super({
      logger: options.logger,
    });

    const transport = options.transport || new Transport();
    this.setTransport(transport);
    this.requestQueue = [];
    this.transportAttached = false;
    this.handleRequest = this.handleRequest.bind(this);
    this.handleNotification = this.handleNotification.bind(this);
  }

  /** Attaches msgpack to read/write streams * */
  attach({
    reader,
    writer,
  }: {
    reader: NodeJS.ReadableStream;
    writer: NodeJS.WritableStream;
  }) {
    this.transport.attach(writer, reader, this);
    this.transportAttached = true;
    this.setupTransport();
  }

  get isApiReady(): boolean {
    return this.transportAttached && typeof this._channelId !== 'undefined';
  }

  get channelId(): Promise<number> {
    return (async () => {
      await this._isReady;
      return this._channelId;
    })();
  }

  isAttached(buffer: Buffer): boolean {
    const key = `${buffer.data}`;
    return this.attachedBuffers.has(key);
  }

  handleRequest(
    method: string,
    args: VimValue[],
    resp: any,
    ...restArgs: any[]
  ) {
    this.logger.info('handleRequest: ', method);
    // If neovim API is not generated yet and we are not handle a 'specs' request
    // then queue up requests
    //
    // Otherwise emit as normal
    if (!this.isApiReady && method !== 'specs') {
      this.requestQueue.push({
        type: 'request',
        args: [method, args, resp, ...restArgs],
      });
    } else {
      this.emit('request', method, args, resp);
    }
  }

  emitNotification(method: string, args: any[]) {
    if (method.endsWith('_event')) {
      if (!method.startsWith('nvim_buf_')) {
        this.logger.error('Unhandled event: ', method);
        return;
      }
      const shortName = method.replace(REGEX_BUF_EVENT, '$1');
      const [buffer] = args;
      const bufferKey = `${buffer.data}`;

      if (!this.attachedBuffers.has(bufferKey)) {
        // this is a problem
        return;
      }

      const bufferMap = this.attachedBuffers.get(bufferKey);
      const cbs = bufferMap.get(shortName) || [];
      cbs.forEach(cb => cb(...args));

      // Handle `nvim_buf_detach_event`
      // clean `attachedBuffers` since it will no longer be attached
      if (shortName === 'detach') {
        this.attachedBuffers.delete(bufferKey);
      }
    } else {
      this.emit('notification', method, args);
    }
  }

  handleNotification(method: string, args: VimValue[], ...restArgs: any[]) {
    this.logger.info('handleNotification: ', method);
    // If neovim API is not generated yet then queue up requests
    //
    // Otherwise emit as normal
    if (!this.isApiReady) {
      this.requestQueue.push({
        type: 'notification',
        args: [method, args, ...restArgs],
      });
    } else {
      this.emitNotification(method, args);
    }
  }

  // Listen and setup handlers for transport
  setupTransport() {
    if (!this.transportAttached) {
      throw new Error('Not attached to input/output');
    }

    this.transport.on('request', this.handleRequest);
    this.transport.on('notification', this.handleNotification);
    this.transport.on('detach', () => {
      this.emit('disconnect');
      this.transport.removeAllListeners('request');
      this.transport.removeAllListeners('notification');
      this.transport.removeAllListeners('detach');
    });

    this._isReady = this.generateApi();
  }

  requestApi(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.transport.request(
        'nvim_get_api_info',
        [],
        (err: Error, res: any[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        }
      );
    });
  }

  // Request API from neovim and augment this current class to add these APIs
  async generateApi(): Promise<null | boolean> {
    let results;

    try {
      results = await this.requestApi();
    } catch (err) {
      this.logger.error('Could not get vim api results');
      this.logger.error(err);
    }

    if (results) {
      try {
        const [channelId /* , encodedMetadata */] = results;
        // const metadata = encodedMetadata;
        // this.logger.debug(`$$$: ${metadata}`);

        // Perform sanity check for metadata types
        // Object.keys(metadata.types).forEach((name: string) => {
        // const metaDataForType = metadata.types[name]; // eslint-disable-line @typescript-eslint/no-unused-vars
        // TODO: check `prefix` and `id`
        // });

        this._channelId = channelId;

        // register the non-queueing handlers
        // dequeue any pending RPCs
        this.requestQueue.forEach(pending => {
          if (pending.type === 'notification') {
            this.emitNotification(pending.args[0], pending.args[1]);
          } else {
            this.emit(pending.type, ...pending.args);
          }
        });
        this.requestQueue = [];

        return true;
      } catch (err) {
        this.logger.error(`Could not dynamically generate neovim API: ${err}`, {
          error: err,
        });
        this.logger.error(err.stack);
        return null;
      }
    }

    return null;
  }

  attachBuffer(buffer: Buffer, eventName: string, cb: Function) {
    const bufferKey = `${buffer.data}`;

    if (!this.attachedBuffers.has(bufferKey)) {
      this.attachedBuffers.set(bufferKey, new Map());
    }

    const bufferMap = this.attachedBuffers.get(bufferKey);
    if (!bufferMap.get(eventName)) {
      bufferMap.set(eventName, []);
    }

    const cbs = bufferMap.get(eventName);
    if (cbs.includes(cb)) return cb;
    cbs.push(cb);
    bufferMap.set(eventName, cbs);
    this.attachedBuffers.set(bufferKey, bufferMap);

    return cb;
  }

  /**
   * Returns `true` if buffer should be detached
   */
  detachBuffer(buffer: Buffer, eventName: string, cb: Function) {
    const bufferKey = `${buffer.data}`;
    const bufferMap = this.attachedBuffers.get(bufferKey);
    if (!bufferMap) return false;

    const handlers = (bufferMap.get(eventName) || []).filter(
      handler => handler !== cb
    );

    // Remove eventName listener from bufferMap if no more handlers
    if (!handlers.length) {
      bufferMap.delete(eventName);
    } else {
      bufferMap.set(eventName, handlers);
    }

    if (!bufferMap.size) {
      this.attachedBuffers.delete(bufferKey);
      return true;
    }

    return false;
  }
}
