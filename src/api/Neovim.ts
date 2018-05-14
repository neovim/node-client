import { BaseApi } from './Base';
import { createChainableApi } from './helpers/createChainableApi';
import { Buffer, AsyncBuffer } from './Buffer';
import { Tabpage, AsyncTabpage } from './Tabpage';
import { Window, AsyncWindow } from './Window';
import { VimValue } from '../types/VimValue';

export type UiAttachOptions = {
  rgb?: boolean;
  ext_popupmenu?: boolean;
  ext_tabline?: boolean;
  ext_wildmenu?: boolean;
  ext_cmdline?: boolean;
};

/**
 * Neovim API
 */
export class Neovim extends BaseApi {
  protected prefix: string = 'nvim_';
  public Buffer = Buffer;
  public Window = Window;
  public Tabpage = Tabpage;

  /** Get list of all buffers */
  get buffers(): Promise<Buffer[]> {
    return this.request(`${this.prefix}list_bufs`);
  }

  /** Get current buffer */
  get buffer(): AsyncBuffer {
    return createChainableApi.call(this, 'Buffer', Buffer, () =>
      this.request(`${this.prefix}get_current_buf`)
    );
  }

  /** Set current buffer */
  set buffer(buffer: AsyncBuffer) {
    this.request(`${this.prefix}set_current_buf`, [buffer]);
  }

  /** Get list of all tabpages */
  get tabpages(): Promise<Tabpage[]> {
    return this.request(`${this.prefix}list_tabpages`);
  }

  /** Get current tabpage */
  get tabpage(): AsyncTabpage {
    return createChainableApi.call(this, 'Tabpage', Tabpage, () =>
      this.request(`${this.prefix}get_current_tabpage`)
    );
  }

  /** Set current tabpage */
  set tabpage(tabpage: AsyncTabpage) {
    this.request(`${this.prefix}set_current_tabpage`, [tabpage]);
  }

  /** Get list of all windows */
  get windows(): Promise<Window[]> {
    return this.getWindows();
  }

  /** Get current window */
  get window(): AsyncWindow {
    return this.getWindow();
  }

  /** Set current window */
  set window(win: AsyncWindow) {
    this.setWindow(win);
  }

  /** Get list of all windows */
  getWindows(): Promise<Window[]> {
    return this.request(`${this.prefix}list_wins`);
  }

  /** Get current window */
  getWindow(): AsyncWindow {
    return createChainableApi.call(this, 'Window', Window, () =>
      this.request(`${this.prefix}get_current_win`)
    );
  }

  setWindow(win: Window) {
    // Throw error if win is not instance of Window?
    return this.request(`${this.prefix}set_current_win`, [win]);
  }

  /** Get list of all runtime paths */
  get runtimePaths(): Promise<string[]> {
    return this.request(`${this.prefix}list_runtime_paths`);
  }

  /** Set current directory */
  set dir(dir: string) {
    this.request(`${this.prefix}set_current_dir`, [dir]);
  }

  /** Get current line. Always returns a Promise. */
  get line(): string | Promise<string> {
    return this.getLine();
  }

  /** Set current line */
  set line(line: string | Promise<string>) {
    // Doing this to satisfy TS requirement that get/setters have to be same type
    if (typeof line === 'string') {
      this.setLine(line);
    }
  }

  getLine(): Promise<string> {
    return this.request(`${this.prefix}get_current_line`);
  }

  /** Set current line */
  setLine(line: string): Promise<any> {
    return this.request(`${this.prefix}set_current_line`, [line]);
  }

  /** Gets keymap */
  getKeymap(mode: string): Promise<Array<object>> {
    return this.request(`${this.prefix}get_keymap`, [mode]);
  }

  /** Gets current mode */
  get mode(): Promise<{ mode: string; blocking: boolean }> {
    return this.request(`${this.prefix}get_mode`);
  }

  /** Gets map of defined colors */
  get colorMap(): Promise<{ [name: string]: number }> {
    return this.request(`${this.prefix}get_color_map`);
  }

  /** Get color by name */
  getColorByName(name: string): Promise<number> {
    return this.request(`${this.prefix}get_color_by_name`, [name]);
  }

  /** Get highlight by name or id */
  getHighlight(
    nameOrId: string | number,
    isRgb: boolean
  ): Promise<object> | void {
    let functionName = typeof nameOrId === 'string' ? 'by_name' : 'by_id';
    return this.request(`${this.prefix}get_hl_${functionName}`, [
      nameOrId,
      isRgb,
    ]);
  }

  /** Delete current line in buffer */
  deleteCurrentLine(): Promise<any> {
    return this.request(`${this.prefix}del_current_line`);
  }

  /**
   * Evaluates a VimL expression (:help expression). Dictionaries
   * and Lists are recursively expanded. On VimL error: Returns a
   * generic error; v:errmsg is not updated.
   **/
  eval(expr: string): Promise<VimValue> {
    return this.request(`${this.prefix}eval`, [expr]);
  }

  /**
   * Executes lua, it's possible neovim client does not support this
   */
  lua(code: string, args: Array<VimValue> = []): Promise<object> {
    const _args = Array.isArray(args) ? args : [args];
    return this.request(`${this.prefix}execute_lua`, [code, _args]);
  }

  /** Call a vim function */
  call(fname: string, args: VimValue | Array<VimValue> = []) {
    const _args = Array.isArray(args) ? args : [args];
    return this.request(`${this.prefix}call_function`, [fname, _args]);
  }

  /** Alias for `call` */
  callFunction(fname: string, args: VimValue | Array<VimValue> = []) {
    return this.call(fname, args);
  }

  /** Call Atomic calls */
  callAtomic(calls: Array<VimValue>): Promise<[Array<any>, boolean]> {
    return this.request(`${this.prefix}call_atomic`, [calls]);
  }

  /** Runs a vim command */
  command(arg: string): Promise<any> {
    return this.request(`${this.prefix}command`, [arg]);
  }

  /** Runs a command and returns output (synchronous?) */
  commandOutput(arg: string): Promise<string> {
    return this.request(`${this.prefix}command_output`, [arg]);
  }

  /** Gets a v: variable */
  getVvar(name: string): Promise<VimValue> {
    return this.request(`${this.prefix}get_vvar`, [name]);
  }

  /** feedKeys */
  feedKeys(keys: string, mode: string, escapeCsi: boolean): Promise<any> {
    return this.request(`${this.prefix}feedkeys`, [keys, mode, escapeCsi]);
  }

  /** Sends input keys */
  input(keys: string): Promise<number> {
    return this.request(`${this.prefix}input`, [keys]);
  }

  /** Replace term codes */
  replaceTermcodes(
    str: string,
    fromPart: boolean,
    doIt: boolean,
    special: boolean
  ): Promise<string> {
    return this.request(`${this.prefix}replace_termcodes`, [
      str,
      fromPart,
      doIt,
      special,
    ]);
  }

  /** Gets width of string*/
  strWidth(str: string): Promise<number> {
    return this.request(`${this.prefix}strwidth`, [str]);
  }

  /** Write to output buffer */
  outWrite(str: string): Promise<any> {
    return this.request(`${this.prefix}out_write`, [str]);
  }

  outWriteLine(str: string): Promise<any> {
    return this.outWrite(`${str}\n`);
  }

  /** Write to error buffer */
  errWrite(str: string): Promise<any> {
    return this.request(`${this.prefix}err_write`, [str]);
  }

  /** Write to error buffer */
  errWriteLine(str: string): Promise<any> {
    return this.request(`${this.prefix}err_writeln`, [str]);
  }

  uiAttach(
    width: number,
    height: number,
    options: UiAttachOptions
  ): Promise<void> {
    return this.request(`${this.prefix}ui_attach`, [width, height, options]);
  }

  uiDetach(): Promise<void> {
    return this.request(`${this.prefix}ui_detach`, []);
  }

  uiTryResize(width: number, height: number): Promise<void> {
    return this.request(`${this.prefix}ui_try_resize`, [width, height]);
  }

  /** Set UI Option */
  uiSetOption(name: string, value: any): Promise<void> {
    return this.request(`${this.prefix}ui_set_option`, [name, value]);
  }

  /** Subscribe to nvim event broadcasts */
  subscribe(event: String): Promise<void> {
    return this.request(`${this.prefix}subscribe`, [event]);
  }

  /** Unsubscribe to nvim event broadcasts */
  unsubscribe(event: String): Promise<void> {
    return this.request(`${this.prefix}unsubscribe`, [event]);
  }

  /** Quit nvim */
  quit(): void {
    this.command('qa!');
  }
}
