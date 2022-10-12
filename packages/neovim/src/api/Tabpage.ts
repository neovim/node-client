import { BaseApi } from './Base';
import { ExtType, Metadata } from './types';
import { VimValue } from '../types/VimValue';
import { createChainableApi } from './helpers/createChainableApi';
import { Window, AsyncWindow } from './Window';

export class Tabpage extends BaseApi {
  public prefix: string = Metadata[ExtType.Tabpage].prefix;

  /** Returns all windows of tabpage */
  get windows(): Promise<Window[]> {
    return this.request(`${this.prefix}list_wins`, [this]);
  }

  /** Gets the current window of tabpage */
  get window(): AsyncWindow {
    // Require is here otherwise we get circular refs
    return createChainableApi.call(this, 'Window', Window, () =>
      this.request(`${this.prefix}get_win`, [this])
    );
  }

  /** Is current tabpage valid */
  get valid(): Promise<boolean> {
    return this.request(`${this.prefix}is_valid`, [this]);
  }

  /** Tabpage number */
  get number(): Promise<number> {
    return this.request(`${this.prefix}get_number`, [this]);
  }

  /** Invalid */
  getOption(): Promise<VimValue> {
    const message = 'Tabpage does not have `getOption`';
    this.logger.error(message);
    return Promise.reject(new Error(message));
  }

  /** Invalid */
  setOption(): Promise<void> {
    const message = 'Tabpage does not have `setOption`';
    this.logger.error(message);
    return Promise.reject(new Error(message));
  }
}

export interface AsyncTabpage extends Tabpage, Promise<Tabpage> {}
