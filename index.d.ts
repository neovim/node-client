interface AttachOptions {
  writer?: NodeJS.WritableStream,
  reader?: NodeJS.ReadableStream,
  proc?: NodeJS.ChildProcess,
  socket?: String,
}
export default function attach(options: AttachOptions): Neovim;

export interface Neovim extends NodeJS.EventEmitter {
  quit(): void;
  isApiReady(): Boolean;
  requestApi(): Promise<[integer, any]>;
  equals(rhs: Neovim): boolean;
  getLine(buffer: Buffer, index: number): Promise<string>;
  setLine(buffer: Buffer, index: number, line: string): void;
  delLine(buffer: Buffer, index: number): void;
  getLineSlice(buffer: Buffer, start: number, end: number, include_start: boolean, include_end: boolean): Promise<Array<string>>;
  setLineSlice(buffer: Buffer, start: number, end: number, include_start: boolean, include_end: boolean, replacement: Array<string>): void;
  setVar(window: Window, name: string, value: Object): Promise<Object>;
  delVar(window: Window, name: string): Promise<Object>;
  insert(buffer: Buffer, lnum: number, lines: Array<string>): void;
  uiAttach(width: number, height: number, enable_rgb: boolean): void;
  uiDetach(): void;
  uiTryResize(width: number, height: number): Promise<Object>;
  uiSetOption(name: string, value: Object): void;
  command(command: string): void;
  feedkeys(keys: string, mode: string, escape_csi: boolean): void;
  input(keys: string): Promise<number>;
  replaceTermcodes(str: string, from_part: boolean, do_lt: boolean, special: boolean): Promise<string>;
  commandOutput(str: string): Promise<string>;
  eval(expr: string): Promise<Object>;
  callFunction(fname: string, args: Array<any>): Promise<Object>;
  strwidth(str: string): Promise<number>;
  listRuntimePaths(): Promise<Array<string>>;
  setCurrentDir(dir: string): void;
  getCurrentLine(): Promise<string>;
  setCurrentLine(line: string): void;
  delCurrentLine(): void;
  getVar(name: string): Promise<Object>;
  getVvar(name: string): Promise<Object>;
  getOption(name: string): Promise<Object>;
  setOption(name: string, value: Object): void;
  outWrite(str: string): void;
  errWrite(str: string): void;
  errWriteln(str: string): void;
  listBufs(): Promise<Array<Buffer>>;
  getCurrentBuf(): Promise<Buffer>;
  setCurrentBuf(buffer: Buffer): void;
  listWins(): Promise<Array<Window>>;
  getCurrentWin(): Promise<Window>;
  setCurrentWin(window: Window): void;
  listTabpages(): Promise<Array<Tabpage>>;
  getCurrentTabpage(): Promise<Tabpage>;
  setCurrentTabpage(tabpage: Tabpage): void;
  subscribe(event: string): void;
  unsubscribe(event: string): void;
  getColorByName(name: string): Promise<number>;
  getColorMap(): Promise<{}>;
  getMode(): Promise<{}>;
  getApiInfo(): Promise<Array<any>>;
  callAtomic(calls: Array<any>): Promise<Array<any>>;
  changeDirectory(dir: string): void;
  reportError(str: string): void;
  getBuffers(): Promise<Array<Buffer>>;
  getCurrentBuffer(): Promise<Buffer>;
  setCurrentBuffer(buffer: Buffer): void;
  getWindows(): Promise<Array<Window>>;
  getCurrentWindow(): Promise<Window>;
  setCurrentWindow(window: Window): void;
  getTabpages(): Promise<Array<Tabpage>>;
  nameToColor(name: string): Promise<number>;
}
export interface Buffer {
  equals(rhs: Buffer): boolean;
  lineCount(): Promise<number>;
  getLines(start: number, end: number, strict_indexing: boolean): Promise<Array<string>>;
  setLines(start: number, end: number, strict_indexing: boolean, replacement: Array<string>): void;
  getVar(name: string): Promise<Object>;
  getChangedtick(): Promise<number>;
  setVar(name: string, value: Object): void;
  delVar(name: string): void;
  getOption(name: string): Promise<Object>;
  setOption(name: string, value: Object): void;
  getNumber(): Promise<number>;
  getName(): Promise<string>;
  setName(name: string): void;
  isValid(): Promise<boolean>;
  getMark(name: string): Promise<Array<number>>;
  addHighlight(src_id: number, hl_group: string, line: number, col_start: number, col_end: number): Promise<number>;
  clearHighlight(src_id: number, line_start: number, line_end: number): void;
}
export interface Window {
  equals(rhs: Window): boolean;
  getBuf(): Promise<Buffer>;
  getCursor(): Promise<Array<number>>;
  setCursor(pos: Array<number>): void;
  getHeight(): Promise<number>;
  setHeight(height: number): void;
  getWidth(): Promise<number>;
  setWidth(width: number): void;
  getVar(name: string): Promise<Object>;
  setVar(name: string, value: Object): void;
  delVar(name: string): void;
  getOption(name: string): Promise<Object>;
  setOption(name: string, value: Object): void;
  getPosition(): Promise<Array<number>>;
  getTabpage(): Promise<Tabpage>;
  getNumber(): Promise<number>;
  isValid(): Promise<boolean>;
  getBuffer(): Promise<Buffer>;
}
export interface Tabpage {
  equals(rhs: Tabpage): boolean;
  listWins(): Promise<Array<Window>>;
  getVar(name: string): Promise<Object>;
  setVar(name: string, value: Object): void;
  delVar(name: string): void;
  getWin(): Promise<Window>;
  getNumber(): Promise<number>;
  isValid(): Promise<boolean>;
  getWindows(): Promise<Array<Window>>;
  getWindow(): Promise<Window>;
}
