/// <reference path="../DefinitelyTyped/node/node.d.ts" />

declare module "neovim-client" {
  export default attach;
  function attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream, cb: (err: Error, nvim: Nvim) => void);

  interface Nvim {
    command(str: string, cb: (err: Error) => void): void;
    feedkeys(keys: string, mode: string, escape_csi: boolean, cb: (err: Error) => void): void;
    input(keys: string, cb: (err: Error, res: number) => void): void;
    replaceTermcodes(str: string, from_part: boolean, do_lt: boolean, special: boolean, cb: (err: Error, res: string) => void): void;
    commandOutput(str: string, cb: (err: Error, res: string) => void): void;
    eval(str: string, cb: (err: Error, res: Object) => void): void;
    strwidth(str: string, cb: (err: Error, res: number) => void): void;
    listRuntimePaths(cb: (err: Error, res: Array<string>) => void): void;
    changeDirectory(dir: string, cb: (err: Error) => void): void;
    getCurrentLine(cb: (err: Error, res: string) => void): void;
    setCurrentLine(line: string, cb: (err: Error) => void): void;
    delCurrentLine(cb: (err: Error) => void): void;
    getVar(name: string, cb: (err: Error, res: Object) => void): void;
    setVar(name: string, value: Object, cb: (err: Error, res: Object) => void): void;
    getVvar(name: string, cb: (err: Error, res: Object) => void): void;
    getOption(name: string, cb: (err: Error, res: Object) => void): void;
    setOption(name: string, value: Object, cb: (err: Error) => void): void;
    outWrite(str: string, cb: (err: Error) => void): void;
    errWrite(str: string, cb: (err: Error) => void): void;
    reportError(str: string, cb: (err: Error) => void): void;
    getBuffers(cb: (err: Error, res: Array<Buffer>) => void): void;
    getCurrentBuffer(cb: (err: Error, res: Buffer) => void): void;
    setCurrentBuffer(buffer: Buffer, cb: (err: Error) => void): void;
    getWindows(cb: (err: Error, res: Array<Window>) => void): void;
    getCurrentWindow(cb: (err: Error, res: Window) => void): void;
    setCurrentWindow(window: Window, cb: (err: Error) => void): void;
    getTabpages(cb: (err: Error, res: Array<Tabpage>) => void): void;
    getCurrentTabpage(cb: (err: Error, res: Tabpage) => void): void;
    setCurrentTabpage(tabpage: Tabpage, cb: (err: Error) => void): void;
    subscribe(event: string, cb: (err: Error) => void): void;
    unsubscribe(event: string, cb: (err: Error) => void): void;
    nameToColor(name: string, cb: (err: Error, res: number) => void): void;
    getColorMap(cb: (err: Error, res: {}) => void): void;
    getApiInfo(cb: (err: Error, res: Array<any>) => void): void;
  }
  interface Buffer {
    lineCount(cb: Buffer): void;
    getLine(index: Buffer, cb: number): void;
    setLine(index: Buffer, line: number, cb: string): void;
    delLine(index: Buffer, cb: number): void;
    getLineSlice(start: Buffer, end: number, include_start: number, include_end: boolean, cb: boolean): void;
    setLineSlice(start: Buffer, end: number, include_start: number, include_end: boolean, replacement: boolean, cb: Array<string>): void;
    getVar(name: Buffer, cb: string): void;
    setVar(name: Buffer, value: string, cb: Object): void;
    getOption(name: Buffer, cb: string): void;
    setOption(name: Buffer, value: string, cb: Object): void;
    getNumber(cb: Buffer): void;
    getName(cb: Buffer): void;
    setName(name: Buffer, cb: string): void;
    isValid(cb: Buffer): void;
    insert(lnum: Buffer, lines: number, cb: Array<string>): void;
    getMark(name: Buffer, cb: string): void;
  }
  interface Window {
    getBuffer(cb: Window): void;
    getCursor(cb: Window): void;
    setCursor(pos: Window, cb: Array<number>): void;
    getHeight(cb: Window): void;
    setHeight(height: Window, cb: number): void;
    getWidth(cb: Window): void;
    setWidth(width: Window, cb: number): void;
    getVar(name: Window, cb: string): void;
    setVar(name: Window, value: string, cb: Object): void;
    getOption(name: Window, cb: string): void;
    setOption(name: Window, value: string, cb: Object): void;
    getPosition(cb: Window): void;
    getTabpage(cb: Window): void;
    isValid(cb: Window): void;
  }
  interface Tabpage {
    getWindows(cb: Tabpage): void;
    getVar(name: Tabpage, cb: string): void;
    setVar(name: Tabpage, value: string, cb: Object): void;
    getWindow(cb: Tabpage): void;
    isValid(cb: Tabpage): void;
  }
}
