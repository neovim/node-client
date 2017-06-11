const EventEmitter = require('events').EventEmitter;

const Session = require('msgpack5rpc');

const decode = require('../decode');
const generateWrappers = require('./helpers/generateWrappers');
const createBaseType = require('./helpers/createBaseType');

class Neovim extends EventEmitter {
  constructor(options = {}) {
    super(options);
    const { logger } = options;

    // Required interface
    this._session = new Session([]);
    this._decode = decode;

    this.logger = logger;
    this.requestQueue = [];

    this._generatedApi = false;
    this._sessionAttached = false;

    this.handleRequest = this.handleRequest.bind(this);
    this.handleNotification = this.handleNotification.bind(this);
  }

  attachSession({ reader, writer }) {
    this._session.attach(writer, reader);
    this._sessionAttached = true;
  }

  isApiReady() {
    return this._sessionAttached && this._generatedApi;
  }

  handleRequest(method, args, resp, ...restArgs) {
    this.logger.info('handleRequest: ', method);
    // If neovim API is not generated yet and we are not handle a 'specs' request
    // then queue up requests
    //
    // Otherwise emit as normal
    if (!this.isApiReady() && method !== 'specs') {
      this.requestQueue.push({
        type: 'request',
        args: [method, args, resp, ...restArgs],
      });
    } else {
      this.emit('request', decode(method), decode(args), resp);
    }
  }

  handleNotification(method, args, ...restArgs) {
    this.logger.info('handleNotification: ', method);
    // If neovim API is not generated yet then queue up requests
    //
    // Otherwise emit as normal
    if (!this.isApiReady()) {
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
      this.logger.debug('detached');
      this._session.removeAllListeners('request');
      this._session.removeAllListeners('notification');
      this.emit('disconnect');
    });

    this.apiPromise = this.generateApi();
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
      this.logger.error('Could not get vim api results');
      this.logger.error(err);
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
          // Generate a constructor function for each type in metadata.types
          // eslint-disable-next-line no-new-func
          const ExtType = createBaseType(name);
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
                logger: this.logger,
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

        this.logger.debug('generate wrappers');
        generateWrappers(Neovim, types, prefixMap, metadata);

        this._channel_id = channelId;
        this._generatedApi = true;
        this.logger.debug('add types');
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

  // Extra API methods
  quit() {
    this.command('qa!', []);
  }
}

module.exports = Neovim;
module.exports.default = module.exports;
