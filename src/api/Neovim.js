/**
 * Neovim API
 */
const BaseApi = require('./Base');
const createChainableApi = require('./helpers/createChainableApi');
const TYPES = require('./helpers/types');

class Neovim extends BaseApi {
  get buffer() {
    return createChainableApi.call(this, 'Buffer', TYPES.Buffer, () =>
      this.request('nvim_get_current_buf')
    );
  }

  get tabpage() {
    return createChainableApi.call(this, 'Tabpage', TYPES.Tabpage, () =>
      this.request('nvim_get_current_tabpage')
    );
  }

  get tabpages() {
    return this.request('nvim_list_tabpages');
  }

  set tabpage(tabpage) {
    return this.request('nvim_set_current_tabpage', [tabpage]);
  }

  get window() {
    return createChainableApi.call(this, 'Window', TYPES.Window, () =>
      this.request('nvim_get_current_win')
    );
  }

  get windows() {
    return this.request('nvim_list_wins');
  }

  set window(win) {
    // Throw error if win is not instance of Window?
    return this.request('nvim_set_current_win', [win]);
  }

  eval(arg) {
    return this.request('nvim_eval', [arg]);
  }

  call(arg) {
    return this.request('nvim_call', [arg]);
  }

  command(arg) {
    return this.request('nvim_command', [arg]);
  }

  // Extra API methods
  quit() {
    this.command('qa!');
  }
}

module.exports = Neovim;
module.exports.default = module.exports;
