const BaseApi = require('./Base');

class Tabpage extends BaseApi {
  // @return Promise<Array<Window>>
  get windows() {
    return this.request(`${this.prefix}list_wins`, [this]);
  }

  // @return Promise<Window>
  get window() {
    return this.request(`${this.prefix}get_win`, [this]);
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
