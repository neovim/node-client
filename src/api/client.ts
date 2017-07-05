/**
 * Handles attaching session
 */
import { ILogger } from '../utils/logger';
import { Transport } from '../utils/transport';
import { TYPES } from './helpers/types';
import { VimValue } from '../types/VimValue';
import { Neovim } from './Neovim';

export class NeovimClient extends Neovim {
  protected requestQueue: Array<any>;
  private _sessionAttached: boolean;
  private _channel_id: number;

  constructor(options: { session?: Transport; logger?: ILogger } = {}) {
    const session = options.session || new Transport();
    const { logger } = options;

    // Neovim has no `data` or `metadata`
    super({
      logger,
      session,
    });

    this.requestQueue = [];
    this._sessionAttached = false;
    this.handleRequest = this.handleRequest.bind(this);
    this.handleNotification = this.handleNotification.bind(this);
  }

  attachSession({
    reader,
    writer,
  }: {
    reader: NodeJS.ReadableStream;
    writer: NodeJS.WritableStream;
  }) {
    this._session.attach(writer, reader);
    this._sessionAttached = true;
    this.startSession();
  }

  get isApiReady(): boolean {
    return this._sessionAttached && typeof this._channel_id !== 'undefined';
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

  // Listen and setup handlers for session
  startSession() {
    if (!this._sessionAttached) {
      throw new Error('Not attached to input/output');
    }

    this._session.on('request', this.handleRequest);
    this._session.on('notification', this.handleNotification);
    this._session.on('detach', () => {
      // this.logger.debug('detached');
      this.emit('disconnect');
      this._session.removeAllListeners('request');
      this._session.removeAllListeners('notification');
      this._session.removeAllListeners('detach');
    });

    this._isReady = this.generateApi();
  }

  requestApi(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this._session.request(
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
