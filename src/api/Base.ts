import { EventEmitter } from 'events';
import { logger as loggerModule } from '../utils/logger';
import { decode } from '../utils/decode';
import { VimValue } from '../types/VimValue';


// Instead of dealing with multiple inheritance (or lackof), just extend EE
// Only the Neovim API class should use EE though
export class BaseApi extends EventEmitter {
  _session;
  _data;
  _decode;
  protected _isReady;
  protected prefix: string;
  public logger;

  constructor({
    session,
    data,
    logger,
    metadata,
  }: {
    session;
    logger?;
    data?;
    metadata?;
  }) {
    super();

    this._session = session;
    this._data = data;
    this._decode = decode;

    this.logger = logger || loggerModule;

    if (metadata) {
      Object.defineProperty(this, 'metadata', { value: metadata });
      if (metadata.prefix) {
        Object.defineProperty(this, 'prefix', { value: metadata.prefix });
      }
    }
  }

  equals(other) {
    try {
      return this._data.toString() === other._data.toString();
    } catch (e) {
      return false;
    }
  }

  async request(name: string, args: any[] = []): Promise<any> {
    // `this._isReady` is undefined in ExtType classes (i.e. Buffer, Window, Tabpage)
    // But this is just for Neovim API, since it's possible to call this method from Neovim class
    // before session is ready.
    // Not possible for ExtType classes since they are only created after session is ready
    await this._isReady;
    this.logger.debug(`request -> neovim.api.${name}`);
    return new Promise((resolve, reject) => {
      this._session.request(name, args, (err: any, res: any) => {
        this.logger.debug(`response -> neovim.api.${name}: ${res}`);
        if (err) {
          reject(new Error(`${name}: ${err[1]}`));
        } else {
          resolve(res);
        }
      });
    });
  }

  _getArgsByPrefix(...args) {
    const _args = [];

    // Check if class is Neovim and if so, should not send `this` as first arg
    if (this.prefix !== 'nvim_') {
      _args.push(this);
    }
    return _args.concat(args);
  }

  /** Retrieves a scoped variable depending on type (using `this.prefix`) */
  getVar(name: string): Promise<string> {
    const args = this._getArgsByPrefix(name);

    return this.request(`${this.prefix}get_var`, args).then(
      res => res,
      err => {
        if (err && err.message && err.message.includes('Key not found')) {
          return null;
        }
        throw err;
      }
    );
  }

  /** Set a scoped variable */
  setVar(name: string, value: any): Promise<any> {
    const args = this._getArgsByPrefix(name, value);
    return this.request(`${this.prefix}set_var`, args);
  }

  /** Delete a scoped variable */
  deleteVar(name: string): Promise<any> {
    const args = this._getArgsByPrefix(name);
    return this.request(`${this.prefix}del_var`, args);
  }

  /** Retrieves a scoped option depending on type of `this` */
  getOption(name: string): Promise<any> | void {
    const args = this._getArgsByPrefix(name);
    return this.request(`${this.prefix}get_option`, args);
  }

  /** Set scoped option */
  setOption(name: string, value: any): Promise<any> | void {
    const args = this._getArgsByPrefix(name, value);
    return this.request(`${this.prefix}set_option`, args);
  }

  // TODO: Is this necessary?
  /** `request` is basically the same except you can choose to wait forpromise to be resolved */
  notify(name: string, args: any[]) {
    this.logger.debug(`notify -> neovim.api.${name}`);
    this._session.notify(name, args);
  }
}
