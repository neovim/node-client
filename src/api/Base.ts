import { EventEmitter } from "events";
import { logger as loggerModule } from "../utils/logger";
import { decode } from "../utils/decode";

// Instead of dealing with multiple inheritance (or lackof), just extend EE
// Only the Neovim API class should use EE though
export class BaseApi extends EventEmitter {
  _session;
  _data;
  _decode;
  protected _isReady;
  prefix: string;
  public logger;

  constructor({
    session,
    data,
    logger,
    metadata
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
      Object.defineProperty(this, "metadata", { value: metadata });
      if (metadata.prefix) {
        Object.defineProperty(this, "prefix", { value: metadata.prefix });
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

  async request(name, args = []) {
    // `this._isReady` is undefined in ExtType classes (i.e. Buffer, Window, Tabpage)
    // But this is just for Neovim API, since it's possible to call this method from Neovim class
    // before session is ready.
    // Not possible for ExtType classes since they are only created after session is ready
    await this._isReady;
    this.logger.debug(`request -> neovim.api.${name}`);
    return new Promise((resolve, reject) => {
      // does args need this?
      this._session.request(name, args, (err, res) => {
        this.logger.debug(`response -> neovim.api.${name}: ${res}`);
        if (err) {
          reject(new Error(`${name}: ${err[1]}`));
        } else {
          resolve(res);
        }
      });
    });
  }

  // static
  _getArgsByPrefix(...args) {
    const _args = [];

    // Check if class is Neovim and if so, should not send `this` as first arg
    if (this.prefix !== "nvim_") {
      _args.push(this);
    }
    return _args.concat(args);
  }

  // Retrieves a scoped variable depending on `this`
  getVar(name): Promise<string> {
    const args = this._getArgsByPrefix(name);

    return this.request(`${this.prefix}get_var`, args).then(
      res => res,
      err => {
        if (err && err.message && err.message.includes("Key not found")) {
          return null;
        }
        throw err;
      }
    );
  }

  setVar(name, value): Promise<any> {
    const args = this._getArgsByPrefix(name, value);
    return this.request(`${this.prefix}set_var`, args);
  }

  deleteVar(name): Promise<any> {
    const args = this._getArgsByPrefix(name);
    return this.request(`${this.prefix}del_var`, args);
  }

  // Retrieves a scoped option depending on `this`
  getOption(name): Promise<any> | void {
    const args = this._getArgsByPrefix(name);
    return this.request(`${this.prefix}get_option`, args);
  }

  setOption(name, value): Promise<any> | void {
    const args = this._getArgsByPrefix(name, value);
    return this.request(`${this.prefix}set_option`, args);
  }

  // TODO: Is this necessary?
  // `request` is basically the same except you can choose to wait forpromise to be resolved
  notify(name, args) {
    this.logger.debug(`notify -> neovim.api.${name}`);
    this._session.notify(name, args);
  }
}
