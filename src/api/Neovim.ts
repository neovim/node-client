import { BaseApi } from './Base';
import { createChainableApi } from './helpers/createChainableApi';
import { Buffer, AsyncBuffer } from './Buffer';
import { Tabpage, AsyncTabpage } from './Tabpage';
import { Window, AsyncWindow } from './Window';
import { VimValue } from '../types/VimValue';
import { ApiInfo } from '../types/ApiInfo'; // eslint-disable-line

export type UiAttachOptions = {
  rgb?: boolean;
  // eslint-disable-next-line camelcase
  ext_popupmenu?: boolean;
  // eslint-disable-next-line camelcase
  ext_tabline?: boolean;
  // eslint-disable-next-line camelcase
  ext_wildmenu?: boolean;
  // eslint-disable-next-line camelcase
  ext_cmdline?: boolean;
};

export type Ui = UiAttachOptions & {
  height: number;
  width: number;
  chan?: number;
};

export type Proc = {
  ppid: number;
  name: string;
  pid: number;
};

export type Channel = {
  id: number;
  stream: string;
  stdio?: object;
  stderr?: object;
  socket?: object;
  job?: any;
  mode?: string;
};

export type Command = {
  bang: boolean;
  nargs: string;
  range: string;
  name: string;
  // eslint-disable-next-line camelcase
  script_id: number;
  bar: boolean;
  register: boolean;
  definition: string;

  complete?: null;
  addr?: any;
  count?: any;
  // eslint-disable-next-line camelcase
  complete_arg?: any;
};

/**
 * Neovim API
 */
export class Neovim extends BaseApi {
  protected prefix: string = 'nvim_';
  public Buffer = Buffer;
  public Window = Window;
  public Tabpage = Tabpage;

  /**
   * Retrieves nvim API information
   */
  get apiInfo(): Promise<[number, ApiInfo]> {
    return this.request(`${this.prefix}get_api_info`);
  }

  /**
   * Gets the current list of buffer handles
   *
   * Includes unlisted (unloaded/deleted) buffers, like `ls!`. Use `Buffer.isLoaded`
   * to check if a buffer is loaded
   *
   * @return {Buffer[]} List of buffer handles
   */
  get buffers(): Promise<Buffer[]> {
    return this.request(`${this.prefix}list_bufs`);
  }

  /**
   * Gets the current buffer
   *
   * @return {Buffer} Buffer handle
   */
  get buffer(): AsyncBuffer {
    return createChainableApi.call(this, 'Buffer', Buffer, () =>
      this.request(`${this.prefix}get_current_buf`)
    );
  }

  /**
   * Sets the current buffer
   */
  set buffer(buffer: AsyncBuffer) {
    this.request(`${this.prefix}set_current_buf`, [buffer]);
  }

  /**
   * Get information about all open channels
   *
   * @return {Channel[]} Array of channels
   */
  get chans(): Promise<Channel[]> {
    return this.request(`${this.prefix}list_chans`);
  }

  /**
   * Gets information about a channel
   *
   * @param {Number} chan The channel number
   * @return {Channel} A channel
   */
  getChanInfo(chan: number): Promise<Channel> {
    return this.request(`${this.prefix}get_chan_info`, [chan]);
  }

  /**
   * Gets a map of buffer-local |user-commands|.
   */
  get commands(): Promise<Command> {
    return this.getCommands();
  }

  /**
   * Gets a map of buffer-local |user-commands|.
   *
   * @param {Object} options Optional parameters (currently not used)
   * @return {Object} Map of maps describing commands
   */
  getCommands(options = {}): Promise<Command> {
    return this.request(`${this.prefix}get_commands`, [options]);
  }

  /**
   * Gets the current list of tabpage handles
   *
   * @return {Tabpage[]} List of tagpage handles
   */
  get tabpages(): Promise<Tabpage[]> {
    return this.request(`${this.prefix}list_tabpages`);
  }

  /**
   * Gets the window tabpage
   *
   * @return {Tabpage} Tagpage that contains the window
   */
  get tabpage(): AsyncTabpage {
    return createChainableApi.call(this, 'Tabpage', Tabpage, () =>
      this.request(`${this.prefix}get_current_tabpage`)
    );
  }

  /**
   * Sets the current tabpage
   */
  set tabpage(tabpage: AsyncTabpage) {
    this.request(`${this.prefix}set_current_tabpage`, [tabpage]);
  }

  /**
   * Gets the current list of window handles
   *
   * @return {Window[]} List of window handles
   */
  get windows(): Promise<Window[]> {
    return this.getWindows();
  }

  /**
   * Gets the current window
   *
   * @return {Window} Window handle
   */
  get window(): AsyncWindow {
    return this.getWindow();
  }

  /**
   * Sets the current window
   *
   * @param {Window} Window handle
   */
  set window(win: AsyncWindow) {
    this.setWindow(win);
  }

  /**
   * Gets the current list of window handles
   *
   * @return {Window[]} List of window handles
   */
  getWindows(): Promise<Window[]> {
    return this.request(`${this.prefix}list_wins`);
  }

  /**
   * Gets the current window
   *
   * @return {Window} Window handle
   */
  getWindow(): AsyncWindow {
    return createChainableApi.call(this, 'Window', Window, () =>
      this.request(`${this.prefix}get_current_win`)
    );
  }

  /**
   * Sets the current window
   *
   * @param {Window} Window handle
   */
  setWindow(win: Window) {
    // Throw error if win is not instance of Window?
    return this.request(`${this.prefix}set_current_win`, [win]);
  }

  /**
   * Gets the paths contained in "runtimepath"
   *
   * @return {String[]} List of paths
   */
  get runtimePaths(): Promise<string[]> {
    return this.request(`${this.prefix}list_runtime_paths`);
  }

  /**
   * Changes the global working directory
   *
   * @param {String} Directory path
   *
   */
  set dir(dir: string) {
    this.request(`${this.prefix}set_current_dir`, [dir]);
  }

  /**
   * Gets the current line
   *
   * @return {String} Current line string
   */
  get line(): string | Promise<string> {
    return this.getLine();
  }

  /**
   * Sets current line
   *
   * @param {String} line Line contents
   */
  set line(line: string | Promise<string>) {
    // Doing this to satisfy TS requirement that get/setters have to be same type
    if (typeof line === 'string') {
      this.setLine(line);
    }
  }

  /**
   * Gets the current line
   *
   * @return {String} Current line string
   */
  getLine(): Promise<string> {
    return this.request(`${this.prefix}get_current_line`);
  }

  /**
   * Sets current line
   *
   * @param {String} line Line contents
   */
  setLine(line: string): Promise<any> {
    return this.request(`${this.prefix}set_current_line`, [line]);
  }

  /**
   * Gets a list of global (non-buffer-local) |mapping| definitions.
   *
   * @param {String} mode Mode short-name ("n", "i", "v", ...)
   * @return {Object[]}  Array of maparg()-like dictionaries describing mappings. The "buffer" key is always zero.
   */
  getKeymap(mode: string): Promise<object[]> {
    return this.request(`${this.prefix}get_keymap`, [mode]);
  }

  /**
   * Gets the current mode. |mode()| "blocking" is true if Nvim is waiting for input.
   *
   * @return {Object} Dictionary { "mode": String, "blocking": Boolean }
   */
  get mode(): Promise<{ mode: string; blocking: boolean }> {
    return this.request(`${this.prefix}get_mode`);
  }

  /**
   * Gets map of defined colors
   *
   * @return {Object} Color map
   */
  get colorMap(): Promise<{ [name: string]: number }> {
    return this.request(`${this.prefix}get_color_map`);
  }

  /**
   * Get color by name
   *
   * @param {String} name Color name
   * @return {Number} Color value
   */
  getColorByName(name: string): Promise<number> {
    return this.request(`${this.prefix}get_color_by_name`, [name]);
  }

  /**
   * Get highlight by name or id
   *
   * @param {String|Number} nameOrId Name or ID
   * @param {Boolean} isRgb Should export RGB colors
   * @return {Object} Highlight definition map
   */
  getHighlight(
    nameOrId: string | number,
    isRgb: boolean = true
  ): Promise<object> | void {
    const functionName = typeof nameOrId === 'string' ? 'by_name' : 'by_id';
    return this.request(`${this.prefix}get_hl_${functionName}`, [
      nameOrId,
      isRgb,
    ]);
  }

  /**
   * Get highlight definition by name
   *
   * @param {String} name Highlight group name
   * @param {Boolean} isRgb Should export RGB colors
   * @return {Object} Highlight definition map
   */
  getHighlightByName(name: string, isRgb: boolean = true): Promise<object> {
    return this.request(`${this.prefix}get_hl_by_name`, [name, isRgb]);
  }

  /**
   * Get highlight definition by id |hlID()|
   *
   * @param {Number} id Highlight id as returned by |hlID()|
   * @param {Boolean} isRgb Should export RGB colors
   * @return {Object} Highlight definition map
   */
  getHighlightById(id: number, isRgb: boolean = true): Promise<object> {
    return this.request(`${this.prefix}get_hl_by_id`, [id, isRgb]);
  }

  /**
   * Deletes the current line
   */
  deleteCurrentLine(): Promise<any> {
    return this.request(`${this.prefix}del_current_line`);
  }

  /**
   * Evaluates a VimL expression (:help expression). Dictionaries
   * and Lists are recursively expanded. On VimL error: Returns a
   * generic error; v:errmsg is not updated.
   *
   */
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

  /**
   * Alias for `lua()` to be consistent with neovim API
   */
  executeLua(code: string, args: Array<VimValue> = []): Promise<object> {
    return this.lua(code, args);
  }

  /**
   * Calls a VimL |Dictionary-function| with the given arguments.
   *
   * On execution error: fails with VimL error, does not update v:errmsg.
   */
  callDictFunction(
    dict: object,
    fname: string,
    args: VimValue | Array<VimValue> = []
  ): object {
    const _args = Array.isArray(args) ? args : [args];
    return this.request(`${this.prefix}call_dict_function`, [
      dict,
      fname,
      _args,
    ]);
  }

  /**
   * Calls a VimL function with the given arguments.
   *
   * On execution error: fails with VimL error, does not update v:errmsg.
   */
  call(fname: string, args: VimValue | Array<VimValue> = []) {
    const _args = Array.isArray(args) ? args : [args];
    return this.request(`${this.prefix}call_function`, [fname, _args]);
  }

  /**
   * Alias for `call`
   */
  callFunction(fname: string, args: VimValue | Array<VimValue> = []) {
    return this.call(fname, args);
  }

  /**
   * Calls many API methods atomically.
   *
   * This has two main usages:
   *  - To perform several requests from an async context atomically, i.e. without
   * interleaving redraws, RPC requests from other clients, or user interactions
   * (however API methods may trigger autocommands or event processing which have
   * such side-effects, e.g. |:sleep| may wake timers)
   *
   *  - To minimize RPC overhead (roundtrips) of a sequence of many requests.
   */
  callAtomic(calls: Array<VimValue>): Promise<[Array<any>, boolean]> {
    return this.request(`${this.prefix}call_atomic`, [calls]);
  }

  /**
   * Executes an ex-command.
   *
   * On execution error: fails with VimL error, does not update v:errmsg.
   *
   * @param {String} arg Ex-command string
   */
  command(arg: string): Promise<any> {
    return this.request(`${this.prefix}command`, [arg]);
  }

  /**
   * Executes an ex-command and returns its (non-error) output.
   * Shell |:!| output is not captured.
   *
   * On execution error: fails with VimL error, does not update v:errmsg.
   */
  commandOutput(arg: string): Promise<string> {
    return this.request(`${this.prefix}command_output`, [arg]);
  }

  /**
   * Gets a v: variable
   *
   * @param {String} name Variable name
   * @return {VimValue} Variable value
   */
  getVvar(name: string): Promise<VimValue> {
    return this.request(`${this.prefix}get_vvar`, [name]);
  }

  /**
   * Sends input-keys to Nvim, subject to various quirks controlled
   * by `mode` flags. This is a blocking call, unlike |nvim_input()|.
   *
   * On execution error: does not fail, but updates v:errmsg.
   *
   * @param {String} keys To be typed
   * @param {String} mode Behavior flags, see |feedkeys()|
   * @param {Boolean} escapeCsi If true, escape K_SPECIAL/CSI bytes in `keys`
   */
  feedKeys(keys: string, mode: string, escapeCsi: boolean): Promise<any> {
    return this.request(`${this.prefix}feedkeys`, [keys, mode, escapeCsi]);
  }

  /**
   * Queues raw user-input. Unlike |nvim_feedkeys()|, this uses a
   * low-level input buffer and the call is non-blocking (input is
   * processed asynchronously by the eventloop).
   *
   * On execution error: does not fail, but updates v:errmsg.
   *
   * Note:
   * |keycodes| like <CR> are translated, so "<" is special. To
   * input a literal "<", send <LT>.
   *
   * Note:
   * For mouse events use |nvim_input_mouse()|. The pseudokey
   * form "<LeftMouse><col,row>" is deprecated since
   * |api-level| 6.
   *
   * @param {String} keys To be typed
   */
  input(keys: string): Promise<number> {
    return this.request(`${this.prefix}input`, [keys]);
  }

  /**
   * Parse a VimL Expression
   *
   * TODO: return type, see :help
   */
  parseExpression(
    expr: string,
    flags: string,
    highlight: boolean
  ): Promise<object> {
    return this.request(`${this.prefix}parse_expression`, [
      expr,
      flags,
      highlight,
    ]);
  }

  /**
   * Gets info describing process `pid`.
   *
   * @param {Number} pid pid
   * @return {Proc} Map of process properties, or null if process not found
   */
  getProc(pid: number): Promise<Proc> {
    return this.request(`${this.prefix}get_proc`, [pid]);
  }

  /**
   * Gets the immediate children of process `pid`
   *
   * @return {Proc[]} Array of child process ids, empty if process not found
   */
  getProcChildren(pid: number): Promise<Proc[]> {
    return this.request(`${this.prefix}get_proc_children`, [pid]);
  }

  /**
   * Replaces terminal codes and |keycodes| (<CR>, <Esc>, ...) in a
   * string with the internal representation.
   *
   * @param {String} str String to be converted.
   * @param {Boolean} fromPart Legacy Vim parameter. Usually true.
   * @param {Boolean} doIt Also translate <lt>. Ignored if `special` is false.
   * @param {Boolean} special Replace |keycodes|, e.g. <CR> becomes a "\n" char.
   */

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

  /**
   * Calculates the number of display cells occupied by `text`.
   * <Tab> counts as one cell.
   *
   * @param {String} str Some text
   * @return {Number} Number of cells
   */
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

  /**
   * Gets a list of dictionaries representing attached UIs.
   *
   * @return {Ui[]} Array of UI dictionaries
   * Each dictionary has the following keys:
   * "height" requested height of the UI
   * "width" requested width of the UI
   * "rgb" whether the UI uses rgb colors (false implies cterm colors)
   * "ext_..." Requested UI extensions, see |ui-options|
   * "chan" Channel id of remote UI (not present for TUI)
   */
  get uis(): Promise<Ui[]> {
    return this.request(`${this.prefix}list_uis`);
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

  /**
   * TODO: Documentation
   *
   * @param {Number} width The new requested width
   * @param {Number} height The new requested height
   */
  uiTryResize(width: number, height: number): Promise<void> {
    return this.request(`${this.prefix}ui_try_resize`, [width, height]);
  }

  /**
   * Set UI Option
   */
  uiSetOption(name: string, value: any): Promise<void> {
    return this.request(`${this.prefix}ui_set_option`, [name, value]);
  }

  /**
   * Subscribe to nvim event broadcasts
   *
   * @param {String} event Event type string
   */
  subscribe(event: string): Promise<void> {
    return this.request(`${this.prefix}subscribe`, [event]);
  }

  /**
   * Unsubscribe to nvim event broadcasts
   *
   * @param {String} event Event type string
   */
  unsubscribe(event: string): Promise<void> {
    return this.request(`${this.prefix}unsubscribe`, [event]);
  }

  /**
   * Identify the client for nvim. Can be called more than once,
   * but subsequent calls will remove earlier info, which should be
   * resent if it is still valid. (This could happen if a library
   * first identifies the channel, and a plugin using that library
   * later overrides that info)
   *
   */
  setClientInfo(
    name: string,
    version: object,
    type: string,
    methods: object,
    attributes: object
  ): void {
    this.request(`${this.prefix}set_client_info`, [
      name,
      version,
      type,
      methods,
      attributes,
    ]);
  }

  /**
   * Creates a new namespace, or gets an existing one.
   *
   * Namespaces are used for buffer highlights and virtual text,
   * see |nvim_buf_add_highlight()| and |nvim_buf_set_virtual_text()|.
   *
   * Namespaces can be named or anonymous. If `name` matches an
   * existing namespace, the associated id is returned. If `name`
   * is an empty string a new, anonymous namespace is created.
   *
   * @param {String} name Namespace name or empty string
   * @return {Number} Namespace id
   */
  createNamespace(name: string = ''): Promise<number> {
    return this.request(`${this.prefix}create_namespace`, [name]);
  }

  /**
   * Alias for `getNamespaces()`
   */
  get namespaces(): Promise<{ [name: string]: number }> {
    return this.getNamespaces();
  }

  /**
   * Gets existing, non-anonymous namespaces.
   *
   * @return {Object} dict that maps from names to namespace ids.
   */
  getNamespaces(): Promise<{ [name: string]: number }> {
    return this.request(`${this.prefix}get_namespaces`);
  }

  /**
   * Quit nvim
   */
  quit(): void {
    this.command('qa!');
  }
}
