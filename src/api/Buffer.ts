import { BaseApi } from './Base';
export interface BufferSetLines {
  start?: number,
  end?: number,
  strictIndexing?: boolean,
}
export interface BufferHighlight {
  hlGroup?: string,
  line?: number,
  colStart?: number,
  colEnd?: number,
  srcId?: number,
  async?: boolean,
}
export interface BufferClearHighligh {
  srcId?: number,
  lineStart?: number,
  lineEnd?: number,
  async?: boolean,
}
export class Buffer extends BaseApi {
  get length(): Promise<number> {
    return this.request(`${this.prefix}line_count`, [this]);
  }

  get lines(): Promise<Array<string>> {
    return this.getLines();
  }

  // Gets a changed tick of a buffer
  // @return Promise<number>
  get changedtick() {
    return this.request(`${this.prefix}get_changedtick`, [this]);
  }

  // Get lines
  getLines(
    { start, end, strictIndexing } = { start: 0, end: -1, strictIndexing: true }
  ): Promise<Array<string>> {
    const indexing = typeof strictIndexing === 'undefined'
      ? true
      : strictIndexing;
    return this.request(`${this.prefix}get_lines`, [
      this,
      start,
      end,
      indexing,
    ]);
  }

  setLines(
    _lines: string | string[],
    { start: _start, end: _end, strictIndexing }: BufferSetLines = {
      strictIndexing: true,
    }
  ) {
    // TODO: Error checking
    // if (typeof start === 'undefined' || typeof end === 'undefined') {
    // }
    const indexing = typeof strictIndexing === 'undefined'
      ? true
      : strictIndexing;
    const lines = typeof _lines === 'string' ? [_lines] : _lines;
    const end = typeof _end !== 'undefined' ? _end : _start + 1;

    return this.request(`${this.prefix}set_lines`, [
      this,
      _start,
      end,
      indexing,
      lines,
    ]);
  }

  // Insert lines at `start` index
  insert(lines: Array<string> | string, start: number) {
    return this.setLines(lines, { start, end: start, strictIndexing: true });
  }

  // Replace lines starting at `start` index
  replace(_lines: Array<string> | string, start: number) {
    const lines = typeof _lines === 'string' ? [_lines] : _lines;
    return this.setLines(lines, {
      start,
      end: start + lines.length + 1,
      strictIndexing: false,
    });
  }

  remove(start: number, end: number, strictIndexing: boolean) {
    return this.setLines([], { start, end, strictIndexing });
  }

  // Append a string or list of lines to end of buffer
  append(lines: Array<string> | string) {
    return this.setLines(lines, { start: -1, end: -1, strictIndexing: false });
  }

  // Buffer name
  get name(): string | Promise<string> {
    return this.request(`${this.prefix}get_name`, [this]);
  }

  set name(value: string | Promise<string>) {
    this.request(`${this.prefix}set_name`, [this, value]);
  }

  // Is current buffer valid
  // @return Promise<boolean>
  get valid(): Promise<boolean> {
    return this.request(`${this.prefix}is_valid`, [this]);
  }

  mark(name: string): Promise<[number, number]> {
    return this.request(`${this.prefix}get_mark`, name);
  }

  // range(start, end) {
  // """Return a `Range` object, which represents part of the Buffer."""
  // return Range(this, start, end)
  // }

  addHighlight({
    hlGroup,
    line,
    colStart,
    colEnd,
    srcId,
    async: _isAsync,
  }: BufferHighlight): Promise<number> {
    const colEnd = typeof _end !== 'undefined' ? _end : -1;
    const colStart = typeof _start !== 'undefined' ? _start : -0;
    const srcId = typeof _srcId !== 'undefined' ? _srcId : -1;
    const isAsync = _isAsync || typeof srcId !== 'undefined';
    return this.request(`${this.prefix}add_highlight`, [
      srcId,
      hlGroup,
      line,
      colStart,
      colEnd,
      isAsync,
    ]);
  }

  clearHighlight(
    { srcId, lineStart, lineEnd, async }: BufferClearHighligh = {
      srcId: -1,
      lineStart: 0,
      lineEnd: -1,
      async: true,
    }
  ) {
    return this.request(`${this.prefix}clear_highlight`, [
      srcId,
      lineStart,
      lineEnd,
      async,
    ]);
  }
}
