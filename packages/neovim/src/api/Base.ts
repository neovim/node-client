import { EventEmitter } from 'events';

import { Transport } from '../utils/transport';
import { logger as loggerModule, ILogger } from '../utils/logger';
import { VimValue } from '../types/VimValue';

export interface BaseConstructorOptions {
  transport?: Transport;
  logger?: ILogger;
  data?: Buffer;
  metadata?: any;
  client?: any;
}

const DO_REQUEST = Symbol('DO_REQUEST');

// TODO:
// APIs that should not be allowed to be called directly
// attach/detach should be handled by the API client instead of the
// user directly.
//
// i.e. a plugin that detaches will affect all plugins registered on host
// const EXCLUDED = ['nvim_buf_attach', 'nvim_buf_detach'];

// Instead of dealing with multiple inheritance (or lackof), just extend EE
// Only the Neovim API class should use EE though
export class BaseApi extends EventEmitter {
  protected transport: Transport;

  protected _isReady: Promise<boolean>;

  protected prefix: string;

  public logger: ILogger;

  public data: Buffer | number;

  // Node Buffer
  protected client: any;

  constructor({
    transport,
    data,
    logger,
    metadata,
    client,
  }: BaseConstructorOptions) {
    super();

    this.setTransport(transport);
    this.data = data;
    this.logger = logger || loggerModule;
    this.client = client;

    if (metadata) {
      Object.defineProperty(this, 'metadata', { value: metadata });
    }
  }

  protected setTransport(transport: Transport) {
    this.transport = transport;
  }

  equals(other: BaseApi) {
    try {
      return String(this.data) === String(other.data);
    } catch (e) {
      return false;
    }
  }

  [DO_REQUEST] = (name: string, args: any[] = []): Promise<any> =>
    new Promise((resolve, reject) => {
      this.transport.request(name, args, (err: any, res: any) => {
        this.logger.debug(`response -> neovim.api.${name}: ${res}`);
        if (err) {
          reject(new Error(`${name}: ${err[1]}`));
        } else {
          resolve(res);
        }
      });
      // tslint:disable-next-line
    });

  async request(name: string, args: any[] = []): Promise<any> {
    // `this._isReady` is undefined in ExtType classes (i.e. Buffer, Window, Tabpage)
    // But this is just for Neovim API, since it's possible to call this method from Neovim class
    // before transport is ready.
    // Not possible for ExtType classes since they are only created after transport is ready
    await this._isReady;
    this.logger.debug(`request -> neovim.api.${name}`);
    const promise = this[DO_REQUEST](name, args).catch(err => {
      this.logger.error(`Error making request to ${name}`, err);
    });
    return promise;
  }

  _getArgsByPrefix(...args: any[]) {
    const _args = [];

    // Check if class is Neovim and if so, should not send `this` as first arg
    if (this.prefix !== 'nvim_') {
      _args.push(this);
    }
    return _args.concat(args);
  }

  /** Retrieves a scoped variable depending on type (using `this.prefix`) */
  getVar(name: string): Promise<VimValue> {
    const args = this._getArgsByPrefix(name);

    return this.request(`${this.prefix}get_var`, args).then(
      res => res,
      err => {
        if (err && err.message && err.message.includes('not found')) {
          return null;
        }
        throw err;
      }
    );
  }

  /** Set a scoped variable */
  setVar(name: string, value: VimValue): Promise<void> {
    const args = this._getArgsByPrefix(name, value);
    return this.request(`${this.prefix}set_var`, args);
  }

  /** Delete a scoped variable */
  deleteVar(name: string): Promise<void> {
    const args = this._getArgsByPrefix(name);
    return this.request(`${this.prefix}del_var`, args);
  }

  /** Retrieves a scoped option depending on type of `this` */
  getOption(name: string): Promise<VimValue> | void {
    const args = this._getArgsByPrefix(name);
    return this.request(`${this.prefix}get_option`, args);
  }

  /** Set scoped option */
  setOption(name: string, value: VimValue): Promise<void> | void {
    const args = this._getArgsByPrefix(name, value);
    return this.request(`${this.prefix}set_option`, args);
  }

  // TODO: Is this necessary?
  /** `request` is basically the same except you can choose to wait forpromise to be resolved */
  notify(name: string, args: any[]) {
    this.logger.debug(`notify -> neovim.api.${name}`);
    this.transport.notify(name, args);
  }
}
