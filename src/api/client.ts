/**
 * Handles attaching transport
 */
import { ILogger } from '../utils/logger';
import { Transport } from '../utils/transport';
import { VimValue } from '../types/VimValue';
import { Neovim } from './Neovim';

export class NeovimClient extends Neovim {
  protected requestQueue: Array<any>;
  private transportAttached: boolean;
  private _channel_id: number;

  constructor(options: { transport?: Transport; logger?: ILogger } = {}) {
    const transport = options.transport || new Transport();
    const { logger } = options;

    // Neovim has no `data` or `metadata`
    super({
      logger,
      transport,
    });

    this.requestQueue = [];
    this.transportAttached = false;
    this.handleRequest = this.handleRequest.bind(this);
    this.handleNotification = this.handleNotification.bind(this);
  }

  /** Attaches msgpack to read/write streams **/
  attach({
    reader,
    writer,
  }: {
    reader: NodeJS.ReadableStream;
    writer: NodeJS.WritableStream;
  }) {
    this.transport.attach(writer, reader);
    this.transportAttached = true;
    this.setupTransport();
  }

  get isApiReady(): boolean {
    return this.transportAttached && typeof this._channel_id !== 'undefined';
  }

  get channelId(): Promise<number> {
    return new Promise(async (resolve, reject) => {
      await this._isReady;
      resolve(this._channel_id);
    });
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
      this.emit('notification', method, args);
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
        const [channelId, encodedMetadata] = results;
        const metadata = encodedMetadata;
        // this.logger.debug(`$$$: ${metadata}`);

        // Perform sanity check for metadata types
        Object.keys(metadata.types).forEach((name: string) => {
          // @ts-ignore: Declared but its value is never read
          const metaDataForType = metadata.types[name];
          // TODO: check `prefix` and `id`
        });

        this._channel_id = channelId;

        // register the non-queueing handlers
        // dequeue any pending RPCs
        this.requestQueue.forEach(pending => {
          this.emit(pending.type, ...pending.args);
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
}
