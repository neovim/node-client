import { BaseApi } from './Base';
import { ExtType, Metadata } from './types';
import { createChainableApi } from './helpers/createChainableApi';
import { Tabpage, AsyncTabpage } from './Tabpage';
import { Buffer, AsyncBuffer } from './Buffer';

export interface AsyncWindow extends Window, Promise<Window> {}

export class Window extends BaseApi {
  public prefix: string = Metadata[ExtType.Window].prefix;

  /** Get current buffer of window */
  get buffer(): AsyncBuffer {
    return createChainableApi.call(this, 'Buffer', Buffer, () =>
      this.request(`${this.prefix}get_buf`, [this])
    );
  }

  /** Get the Tabpage that contains the window */
  get tabpage(): AsyncTabpage {
    return createChainableApi.call(this, 'Tabpage', Tabpage, () =>
      this.request(`${this.prefix}get_tabpage`, [this])
    );
  }

  /** Get cursor position */
  get cursor(): [number, number] | Promise<[number, number]> {
    return this.request(`${this.prefix}get_cursor`, [this]);
  }

  /** Set cursor position */
  set cursor(pos: [number, number] | Promise<[number, number]>) {
    this.request(`${this.prefix}set_cursor`, [this, pos]);
  }

  /** Get window height by number of rows */
  get height(): number | Promise<number> {
    return this.request(`${this.prefix}get_height`, [this]);
  }

  /** Set window height by number of rows */
  set height(height: number | Promise<number>) {
    this.request(`${this.prefix}set_height`, [this, height]);
  }

  /** Get window width by number of columns */
  get width(): number | Promise<number> {
    return this.request(`${this.prefix}get_width`, [this]);
  }

  /** Set window width by number of columns  */
  set width(width: number | Promise<number>) {
    this.request(`${this.prefix}set_width`, [this, width]);
  }

  /** Get window position */
  get position(): Promise<[number, number]> {
    return this.request(`${this.prefix}get_position`, [this]);
  }

  /** 0-indexed, on-screen window position(row) in display cells. */
  get row(): Promise<number> {
    return this.request(`${this.prefix}get_position`, [this]).then(
      position => position[0]
    );
  }

  /** 0-indexed, on-screen window position(col) in display cells. */
  get col(): Promise<number> {
    return this.request(`${this.prefix}get_position`, [this]).then(
      position => position[1]
    );
  }

  /** Is window valid */
  get valid(): Promise<boolean> {
    return this.request(`${this.prefix}is_valid`, [this]);
  }

  /** Get window number */
  get number(): Promise<number> {
    return this.request(`${this.prefix}get_number`, [this]);
  }
}
