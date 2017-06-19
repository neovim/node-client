/**
 * Handles attaching session
 */
import * as Session from 'msgpack5rpc'
import { decode } from '../utils/decode';
import { generateWrappers } from './helpers/generateWrappers';
import { createBaseType } from './helpers/createBaseType';
import { TYPES } from './helpers/types';
import { Neovim } from './Neovim';

export class NeovimClient extends Neovim {
  requestQueue: Array<any>;
  _sessionAttached: boolean;
  _channel_id;
  _isReady;
  constructor(options = {}) {
    const session = options.session || new Session([]);
    const { logger } = options;

    // Neovim has no `data` or `metadata`
    super({
      decode,
      logger,
      session,
    });

    this.requestQueue = [];
    this._sessionAttached = false;
    this.handleRequest = this.handleRequest.bind(this);
    this.handleNotification = this.handleNotification.bind(this);
  }

  attachSession({ reader, writer }) {
    this._session.attach(writer, reader);
    this._sessionAttached = true;
    this.startSession();
  }

  get isApiReady() {
    return this._sessionAttached && typeof this._channel_id !== 'undefined';
  }

  handleRequest(method, args, resp, ...restArgs) {
    // this.logger.info('handleRequest: ', method);
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
      this.emit('request', decode(method), decode(args), resp);
    }
  }

  handleNotification(method, args, ...restArgs) {
    // this.logger.info('handleNotification: ', method);
    // If neovim API is not generated yet then queue up requests
    //
    // Otherwise emit as normal
    if (!this.isApiReady) {
      this.requestQueue.push({
        type: 'notification',
        args: [method, args, ...restArgs],
      });
    } else {
      this.emit('notification', decode(method), decode(args));
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

  requestApi() {
    return new Promise((resolve, reject) => {
      this._session.request('nvim_get_api_info', [], (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  // Request API from neovim and augment this current class to add these APIs
  async generateApi() {
    let results;

    try {
      results = await this.requestApi();
    } catch (err) {
      // this.logger.error('Could not get vim api results');
      // this.logger.error(err);
    }

    if (results) {
      try {
        const [channelId, encodedMetadata] = results;
        const metadata = decode(encodedMetadata);
        const extTypes = [];
        const types = {};
        const prefixMap = {};

        // this.logger.debug(`$$$: ${metadata}`);

        Object.keys(metadata.types).forEach(name => {
          let ExtType;

          // Generate a constructor function for each type in metadata.types
          if (typeof TYPES[name] === 'undefined') {
            ExtType = createBaseType(name);
            Object.defineProperty(ExtType, 'name', { value: name });
          } else {
            ExtType = TYPES[name];
          }

          const metaDataForType = metadata.types[name];
          // Collect the type information necessary for msgpack5 deserialization
          // when it encounters the corresponding ext code.
          extTypes.push({
            constructor: ExtType,
            code: metaDataForType.id,
            decode: data =>
              new ExtType({
                session: this._session,
                data,
                metadata: metaDataForType,
                // logger: this.logger,
              }),
            encode: obj => obj._data,
          });

          prefixMap[metaDataForType.prefix] = name;
          types[name] = {
            constructor: ExtType,
            prefix: metaDataForType.prefix,
          };
          Neovim.prototype[name] = ExtType;
        });

        generateWrappers(Neovim, types, prefixMap, metadata);

        this._channel_id = channelId;
        this._session.addTypes(extTypes);

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