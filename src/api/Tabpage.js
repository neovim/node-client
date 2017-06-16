const BaseApi = require('./Base');
const createChainableApi = require('./helpers/createChainableApi');

class Tabpage extends BaseApi {
  // @return Promise<Array<Window>>
  get windows() {
    return this.request(`${this.prefix}list_wins`, [this]);
  }

  // @return Promise<Window>
  get window() {
    // Require is here otherwise we get circular refs
    // eslint-disable-next-line global-require
    const Window = require('./Window');
    return createChainableApi.call(this, 'Window', Window, () =>
      this.request(`${this.prefix}get_win`, [this])
    );
  }

  // Is current tabpage valid
  // @return Promise<boolean>
  get valid() {
    return this.request(`${this.prefix}is_valid`, [this]);
  }

  // @return Promise<Integer>
  get number() {
    return this.request(`${this.prefix}get_number`, [this]);
  }
}

module.exports = Tabpage;
module.exports.default = module.exports;
