import { BaseApi } from "./Base";
import { createChainableApi } from "./helpers/createChainableApi";
import { Buffer } from './Buffer'
import { Tabpage } from './Tabpage';
import { Window } from './Window';
/**
 * Neovim API
 */
export class Neovim extends BaseApi {
  prefix: string = "";
  constructor(options) {
    super(options);

    this.prefix = "nvim_";
  }

  // Buffer
  get buffers(): Promise<Buffer[]> {
    return this.request(`${this.prefix}list_bufs`);
  }

  get buffer(): Buffer | Promise<Buffer> {
    return createChainableApi.call(this, "Buffer", Buffer, () =>
      this.request(`${this.prefix}get_current_buf`)
    );
  }

  // (buffer: Buffer)
  set buffer(buffer: Buffer | Promise<Buffer>) {
    this.request(`${this.prefix}set_current_buf`, [buffer]);
  }

  // TabPage
  get tabpages(): Promise<Tabpage[]> {
    return this.request(`${this.prefix}list_tabpages`);
  }

  get tabpage(): Tabpage | Promise<Tabpage> {
    return createChainableApi.call(this, "Tabpage", Tabpage, () =>
      this.request(`${this.prefix}get_current_tabpage`)
    );
  }
  set tabpage(tabpage: Tabpage | Promise<Tabpage>) {
    this.request(`${this.prefix}set_current_tabpage`, [tabpage]);
  }


  // window

  get windows(): Promise<Window[]> {
    return this.request(`${this.prefix}list_wins`);
  }

  get window(): Window | Promise<Window> {
    return createChainableApi.call(this, "Window", Window, () =>
      this.request(`${this.prefix}get_current_win`)
    );
  }

  set window(win: Window | Promise<Window>) {
    // Throw error if win is not instance of Window?
    this.request(`${this.prefix}set_current_win`, [win]);
  }
  // @return Promise<Array<string>>
  get runtimePaths(): Promise<Array<string>> {
    return this.request(`${this.prefix}list_runtime_paths`);
  }
  // (dir: string): void
  set dir(dir: string) {
    this.request(`${this.prefix}set_current_dir`, [dir]);
  }

  // Get current line
  // @return Promise<string>
  get line(): string | Promise<string> {
    return this.request(`${this.prefix}get_current_line`);
  }

  // Set current line
  // (line: string): void
  set line(line: string | Promise<string>) {
    this.request(`${this.prefix}set_current_line`, [line]);
  }

  get mode(): Promise<string> {
    return this.request(`${this.prefix}get_mode`);
  }

  get colorMap() {
    return this.request(`${this.prefix}get_color_map`);
  }

  // (name: string): number
  getColorByName(name: string): Promise<number> {
    return this.request(`${this.prefix}get_color_by_name`, [name]);
  }

  deleteCurrentLine(): Promise<any> {
    return this.request(`${this.prefix}del_current_line`);
  }

  eval(arg: any[]) {
    return this.request(`${this.prefix}eval`, [arg]);
  }

  call(fname: string, args: Array<any> = []) {
    return this.request(`${this.prefix}call_function`, [fname, args]);
  }

  // (calls: Array<string>): [Array<any>, boolean]
  callAtomic(calls: Array<string>): Promise<[Array<any>, boolean]> {
    return this.request(`${this.prefix}call_atomic`, [calls]);
  }

  command(arg: string) {
    this.request(`${this.prefix}command`, [arg]);
  }

  // TODO: Documentation
  commandOutput(arg: string): Promise<string> {
    return this.request(`${this.prefix}command_output`, [arg]);
  }

  // Gets a v: variable
  getVvar(name: string): Promise<string> {
    return this.request(`${this.prefix}get_vvar`, [name]);
  }

  // (keys: string, mode: string, escapeCsi: boolean): void
  feedKeys(keys: string, mode: string, escapeCsi: boolean): Promise<any> {
    return this.request(`${this.prefix}feedkeys`, [keys, mode, escapeCsi]);
  }

  // (keys: string): number
  input(keys: string): Promise<number> {
    return this.request(`${this.prefix}input`, [keys]);
  }

  // (str: string, fromPart: boolean, doIt: boolean, special: boolean): string
  replaceTermcodes(str: string, fromPart: boolean, doIt: boolean, special: boolean): Promise<string> {
    return this.request(`${this.prefix}replace_termcodes`, [
      str,
      fromPart,
      doIt,
      special
    ]);
  }

  // (str: string): number
  strWidth(str: string): Promise<number> {
    return this.request(`${this.prefix}strwidth`, [str]);
  }

  // (str: string)
  outWrite(str: string): Promise<any> {
    return this.request(`${this.prefix}out_write`, [str]);
  }

  // (str: string)
  errWrite(str: string): Promise<any> {
    return this.request(`${this.prefix}err_write`, [str]);
  }

  // (str: string)
  errWriteLine(str: string): Promise<any> {
    return this.request(`${this.prefix}err_writeln`, [str]);
  }

  // Extra API methods
  quit(): void {
    this.command("qa!");
  }
}
