import { BaseApi } from "./Base";
import { createChainableApi } from "./helpers/createChainableApi";
import { TYPES } from "./helpers/types";
/**
 * Neovim API
 */
export class Neovim extends BaseApi {
  prefix: string = "";
  constructor(options) {
    super(options);

    this.prefix = "nvim_";
  }

  get buffers() {
    return this.request(`${this.prefix}list_bufs`);
  }

  get buffer() {
    return createChainableApi.call(this, "Buffer", TYPES.Buffer, () =>
      this.request(`${this.prefix}get_current_buf`)
    );
  }

  // (buffer: Buffer)
  set buffer(buffer) {
    this.request(`${this.prefix}set_current_buf`, [buffer]);
  }

  get tabpage() {
    return createChainableApi.call(this, "Tabpage", TYPES.Tabpage, () =>
      this.request(`${this.prefix}get_current_tabpage`)
    );
  }

  get tabpages() {
    return this.request(`${this.prefix}list_tabpages`);
  }

  set tabpage(tabpage) {
    this.request(`${this.prefix}set_current_tabpage`, [tabpage]);
  }

  get window() {
    return createChainableApi.call(this, "Window", TYPES.Window, () =>
      this.request(`${this.prefix}get_current_win`)
    );
  }

  get windows() {
    return this.request(`${this.prefix}list_wins`);
  }

  set window(win) {
    // Throw error if win is not instance of Window?
    this.request(`${this.prefix}set_current_win`, [win]);
  }
  // @return Promise<Array<string>>
  get runtimePaths(): Promise<string> {
    return this.request(`${this.prefix}list_runtime_paths`);
  }
  // (dir: string): void
  set dir(dir) {
    this.request(`${this.prefix}set_current_dir`, [dir]);
  }

  // Get current line
  // @return Promise<string>
  get line(): Promise<string> {
    return this.request(`${this.prefix}get_current_line`);
  }

  // Set current line
  // (line: string): void
  set line(line) {
    this.request(`${this.prefix}set_current_line`, [line]);
  }

  get mode(): Promise<string> {
    return this.request(`${this.prefix}get_mode`);
  }

  get colorMap() {
    return this.request(`${this.prefix}get_color_map`);
  }

  // (name: string): number
  getColorByName(name) {
    return this.request(`${this.prefix}get_color_by_name`, [name]);
  }

  deleteCurrentLine(): Promise<any> {
    return this.request(`${this.prefix}del_current_line`);
  }

  eval(arg) {
    return this.request(`${this.prefix}eval`, [arg]);
  }

  call(fname, args = []) {
    return this.request(`${this.prefix}call_function`, [fname, args]);
  }
  
  // (calls: Array<string>): [Array<any>, boolean]
  callAtomic(calls): Promise<[Array<any>, boolean]> {
    return this.request(`${this.prefix}call_atomic`, [calls]);
  }

  command(arg) {
    return this.request(`${this.prefix}command`, [arg]);
  }

  // TODO: Documentation
  commandOutput(arg): Promise<any> {
    return this.request(`${this.prefix}command_output`, [arg]);
  }

  // Gets a v: variable
  getVvar(name): Promise<string> {
    return this.request(`${this.prefix}get_vvar`, [name]);
  }

  // (keys: string, mode: string, escapeCsi: boolean): void
  feedKeys(keys, mode, escapeCsi): Promise<any> {
    return this.request(`${this.prefix}feedkeys`, [keys, mode, escapeCsi]);
  }

  // (keys: string): number
  input(keys) {
    return this.request(`${this.prefix}input`, [keys]);
  }

  // (str: string, fromPart: boolean, doIt: boolean, special: boolean): string
  replaceTermcodes(str, fromPart, doIt, special) {
    return this.request(`${this.prefix}replace_termcodes`, [
      str,
      fromPart,
      doIt,
      special
    ]);
  }

  // (str: string): number
  strWidth(str) {
    return this.request(`${this.prefix}strwidth`, [str]);
  }

  // (str: string)
  outWrite(str) {
    return this.request(`${this.prefix}out_write`, [str]);
  }

  // (str: string)
  errWrite(str): Promise<any> {
    return this.request(`${this.prefix}err_write`, [str]);
  }

  // (str: string)
  errWriteLine(str) {
    return this.request(`${this.prefix}err_writeln`, [str]);
  }

  // Extra API methods
  quit() {
    this.command("qa!");
  }
}
