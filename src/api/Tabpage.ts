import { BaseApi } from './Base';
import { ExtType, Metadata } from './types';
import { createChainableApi } from './helpers/createChainableApi';
import { Window, AsyncWindow } from './Window';

export interface AsyncTabpage extends Tabpage, Promise<Tabpage> {}

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
  getOption(): void {
    this.logger.error('Tabpage does not have `getOption`');
  }

  /** Invalid */
  setOption(): void {
    this.logger.error('Tabpage does not have `setOption`');
  }
}
