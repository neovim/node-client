import { createChainableApi } from './helpers/createChainableApi';
import { BaseApi } from './Base';
import { Tabpage } from './Tabpage';
import { Buffer } from './Buffer';

export class Window extends BaseApi {
  get buffer(): Promise<Buffer> {
    // Circular dependencies
    return createChainableApi.call(this, 'Buffer', Buffer, () =>
      this.request(`${this.prefix}get_buf`, [this])
    );
  }

  // Get the `Tabpage` that contains the window.
  get tabpage(): Promise<Tabpage> {
    // Circular dependencies
    return createChainableApi.call(this, 'Tabpage', Tabpage, () =>
      this.request(`${this.prefix}get_tabpage`, [this])
    );
  }

  get cursor(): [number, number]| Promise<[number, number]> {
    return this.request(`${this.prefix}get_cursor`, [this]);
  }

  set cursor(pos: [number, number]| Promise<[number, number]>) {
    this.request(`${this.prefix}set_cursor`, [this, pos]);
  }

  // Return window height in rows
  get height(): number | Promise<number> {
    return this.request(`${this.prefix}get_height`, [this]);
  }

  set height(height: number | Promise<number>) {
    this.request(`${this.prefix}set_height`, [this, height]);
  }

  // Return window width in rows
  get width(): number | Promise<number> {
    return this.request(`${this.prefix}get_width`, [this]);
  }

  set width(width: number | Promise<number>) {
    this.request(`${this.prefix}set_width`, [this, width]);
  }

  get position(): Promise<[number, number]> {
    return this.request(`${this.prefix}get_position`, [this]);
  }

  // 0-indexed, on-screen window position(row) in display cells.
  get row(): Promise<number> {
    return this.request(`${this.prefix}get_position`, [this]).then(
      position => position[0]
    );
  }

  // 0-indexed, on-screen window position(col) in display cells.
  get col(): Promise<number> {
    return this.request(`${this.prefix}get_position`, [this]).then(
      position => position[1]
    );
  }

  get valid(): Promise<boolean> {
    return this.request(`${this.prefix}is_valid`, [this]);
  }

  get number(): Promise<number> {
    return this.request(`${this.prefix}get_number`, [this]);
  }
}
