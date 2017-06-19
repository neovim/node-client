import { BaseApi } from './Base';
import { createChainableApi} from './helpers/createChainableApi';
import { TYPES } from './helpers/types';
/**
 * Neovim API
 */
export class Neovim extends BaseApi {
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
    this.request('nvim_set_current_tabpage', [tabpage]);
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
    this.request('nvim_set_current_win', [win]);
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