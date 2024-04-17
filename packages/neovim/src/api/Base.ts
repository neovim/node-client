import { EventEmitter } from 'node:events';

import { Transport } from '../utils/transport';
import { partialClone } from '../utils/util';
import { Logger, getLogger } from '../utils/logger';
import { VimValue } from '../types/VimValue';

export interface BaseConstructorOptions {
  transport: Transport;
  logger?: Logger;
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

// Instead of dealing with multiple inheritance (or lackof), just extend EventEmitter
// Only the Neovim API class should use EventEmitter though
export class BaseApi extends EventEmitter {
  protected transport: Transport;

  protected _isReady: Promise<boolean> = Promise.resolve(false);

  protected prefix!: string;

  public logger: Logger;

  public data?: Buffer | number;

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

    this.transport = transport;
    this.data = data;
    this.logger = logger || getLogger();
    this.client = client;

    if (metadata) {
      Object.defineProperty(this, 'metadata', { value: metadata });
    }
  }

  equals(other: BaseApi): boolean {
    try {
      return String(this.data) === String(other.data);
    } catch (e) {
      return false;
    }
  }

  [DO_REQUEST] = (name: string, args: any[] = []): Promise<any> =>
    new Promise((resolve, reject) => {
      this.transport.request(name, args, (err: any, res: any) => {
        if (this.logger.level === 'debug') {
          // Avoid noisy logging of entire Buffer/Window/Tabpage.
          let logData: any;
          try {
            logData =
              res && typeof res === 'object'
                ? partialClone(
                    res,
                    2,
                    ['logger', 'transport', 'client'],
                    '[Object]'
                  )
                : res;
          } catch {
            logData = String(res);
          }
          this.logger.debug(`response -> ${name}: %O`, logData);
        }

        if (err) {
          reject(new Error(`${name}: ${err[1]}`));
        } else {
          resolve(res);
        }
      });
    });

  async asyncRequest(name: string, args: any[] = []): Promise<any> {
    // `this._isReady` is undefined in ExtType classes (i.e. Buffer, Window, Tabpage)
    // But this is just for Neovim API, since it's possible to call this method from Neovim class
    // before transport is ready.
    // Not possible for ExtType classes since they are only created after transport is ready
    await this._isReady;

    this.logger.debug(`request  -> ${name}`);

    return this[DO_REQUEST](name, args).catch(err => {
      // XXX: Get a `*.ts stacktrace. If we re-throw `err` we get a `*.js` trace. tsconfig issue?
      const newError = new Error(err.message);
      this.logger.error(
        `failed request to "%s": %s: %s`,
        name,
        newError.name,
        newError.message
      );
      throw newError;
    });
  }

  request(name: string, args: any[] = []): Promise<any> {
    return this.asyncRequest(name, args);
  }

  _getArgsByPrefix(...args: any[]): any[] {
    const _args = [];

    // Check if class is Neovim and if so, should not send `this` as first arg
    if (this.prefix !== 'nvim_') {
      _args.push(this);
    }
    return _args.concat(args);
  }

  /** Retrieves a scoped variable depending on type (using `this.prefix`) */
  async getVar(name: string): Promise<VimValue> {
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
  notify(name: string, args: any[]): void {
    this.logger.debug(`notify -> ${name}`);
    this.transport.notify(name, args);
  }
}
