import { BaseApi } from './Base';
import { ExtType, Metadata } from './types';
import { createChainableApi } from './helpers/createChainableApi';
import { Tabpage, AsyncTabpage } from './Tabpage';
import { Buffer, AsyncBuffer } from './Buffer';

export interface AsyncWindow extends Window, Promise<Window> {}

export class Window extends BaseApi {
  public prefix: string = Metadata[ExtType.Window].prefix;

  /**
   * The windowid that not change within a Vim session
   */
  get id(): number {
    return this.data as number;
  }

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

  /**
   * Closes window
   *
   * @param {Boolean} force Force close window
   */
  close(force: boolean = false) {
    return this.request(`${this.prefix}close`, [this, force]);
  }

  /**
   * Configure window position. Currently this is only used to
   * configure floating and external windows (including changing a
   * split window to these types).
   *
   * See documentation at |nvim_open_win()|, for the meaning of
   * parameters. Pass in -1 for 'witdh' and 'height' to keep
   * exiting size.
   *
   * When reconfiguring a floating window, absent option keys will
   * not be changed. The following restriction apply: `row`, `col`
   * and `relative` must be reconfigured together. Only changing a
   * subset of these is an error.
   *
   * @param {Window}  window Window handle
   * @param {Number}  width  Width of window (in character cells)
   * @param {Number}  height Height of window (in character cells)
   * @Param {Object}  options Options object
   */
  config(width: number, height: number, options: object = {}) {
    return this.request(`${this.prefix}config`, [this, width, height, options]);
  }
}
