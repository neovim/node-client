const BaseApi = require('./Base');
const createChainableApi = require('./helpers/createChainableApi');

class Window extends BaseApi {
  // @return Promise<Buffer>
  get buffer() {
    // Circular dependencies
    // eslint-disable-next-line global-require
    const Buffer = require('./Buffer');
    return createChainableApi.call(this, 'Buffer', Buffer, () =>
      this.request(`${this.prefix}get_buf`, [this])
    );
  }

  // Get the `Tabpage` that contains the window.
  // @return Promise<Tabpage>
  get tabpage() {
    // Circular dependencies
    // eslint-disable-next-line global-require
    const Tabpage = require('./Tabpage');
    return createChainableApi.call(this, 'Tabpage', Tabpage, () =>
      this.request(`${this.prefix}get_tabpage`, [this])
    );
  }

  // @return Promise<[Integer, Integer]>
  get cursor() {
    return this.request(`${this.prefix}get_cursor`, [this]);
  }

  // pos = tuple of [row, col]
  set cursor(pos) {
    return this.request(`${this.prefix}set_cursor`, [this, pos]);
  }

  // Return window height in rows
  // @return Promise<Integer>
  get height() {
    return this.request(`${this.prefix}get_height`, [this]);
  }

  set height(height) {
    return this.request(`${this.prefix}set_height`, [this, height]);
  }

  // Return window width in rows
  // @return Promise<Integer>
  get width() {
    return this.request(`${this.prefix}get_width`, [this]);
  }

  set width(width) {
    return this.request(`${this.prefix}set_width`, [this, width]);
  }

  get position() {
    return this.request(`${this.prefix}get_position`, [this]);
  }

  // 0-indexed, on-screen window position(row) in display cells.
  get row() {
    return this.request(`${this.prefix}get_position`, [this]).then(
      position => position[0]
    );
  }

  // 0-indexed, on-screen window position(col) in display cells.
  get col() {
    return this.request(`${this.prefix}get_position`, [this]).then(
      position => position[1]
    );
  }

  // @return Promise<Boolean>
  get valid() {
    return this.request(`${this.prefix}is_valid`, [this]);
  }

  // @return Promise<Integer>
  get number() {
    return this.request(`${this.prefix}get_number`, [this]);
  }
}

module.exports = Window;
module.exports.default = module.exports;
