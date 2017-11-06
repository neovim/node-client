import { BaseApi } from './Base';
import { ExtType, Metadata } from './types';

export interface BufferSetLines {
  start?: number;
  end?: number;
  strictIndexing?: boolean;
}
export interface BufferHighlight {
  hlGroup?: string;
  line?: number;
  colStart?: number;
  colEnd?: number;
  srcId?: number;
  async?: boolean;
}
export interface BufferClearHighlight {
  srcId?: number;
  lineStart?: number;
  lineEnd?: number;
  async?: boolean;
}

export interface AsyncBuffer extends Buffer, Promise<Buffer> {}

export class Buffer extends BaseApi {
  public prefix: string = Metadata[ExtType.Buffer].prefix;

  /** Total number of lines in buffer */
  get length(): Promise<number> {
    return this.request(`${this.prefix}line_count`, [this]);
  }

  /** Get lines in buffer */
  get lines(): Promise<Array<string>> {
    return this.getLines();
  }

  /** Gets a changed tick of a buffer */
  get changedtick(): Promise<number> {
    return this.request(`${this.prefix}get_changedtick`, [this]);
  }

  /** Get specific lines of buffer */
  getLines(
    { start, end, strictIndexing } = { start: 0, end: -1, strictIndexing: true }
  ): Promise<Array<string>> {
    const indexing =
      typeof strictIndexing === 'undefined' ? true : strictIndexing;
    return this.request(`${this.prefix}get_lines`, [
      this,
      start,
      end,
      indexing,
    ]);
  }

  /** Set lines of buffer given indeces */
  setLines(
    _lines: string | string[],
    { start: _start, end: _end, strictIndexing }: BufferSetLines = {
      strictIndexing: true,
    }
  ) {
    // TODO: Error checking
    // if (typeof start === 'undefined' || typeof end === 'undefined') {
    // }
    const indexing =
      typeof strictIndexing === 'undefined' ? true : strictIndexing;
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

  /** Insert lines at `start` index */
  insert(lines: Array<string> | string, start: number) {
    return this.setLines(lines, {
      start,
      end: start,
      strictIndexing: true,
    });
  }

  /** Replace lines starting at `start` index */
  replace(_lines: Array<string> | string, start: number) {
    const lines = typeof _lines === 'string' ? [_lines] : _lines;
    return this.setLines(lines, {
      start,
      end: start + lines.length + 1,
      strictIndexing: false,
    });
  }

  /** Remove lines at index */
  remove(start: number, end: number, strictIndexing: boolean) {
    return this.setLines([], { start, end, strictIndexing });
  }

  /** Append a string or list of lines to end of buffer */
  append(lines: Array<string> | string) {
    return this.setLines(lines, {
      start: -1,
      end: -1,
      strictIndexing: false,
    });
  }

  /** Get buffer name */
  get name(): string | Promise<string> {
    return this.request(`${this.prefix}get_name`, [this]);
  }

  /** Set current buffer name */
  set name(value: string | Promise<string>) {
    this.request(`${this.prefix}set_name`, [this, value]);
  }

  /** Is current buffer valid */
  get valid(): Promise<boolean> {
    return this.request(`${this.prefix}is_valid`, [this]);
  }

  /** Get mark position given mark name */
  mark(name: string): Promise<[number, number]> {
    return this.request(`${this.prefix}get_mark`, [this, name]);
  }

  // range(start, end) {
  // """Return a `Range` object, which represents part of the Buffer."""
  // return Range(this, start, end)
  // }

  /** Gets keymap */
  getKeymap(mode: string): Promise<Array<object>> {
    return this.request(`${this.prefix}get_keymap`, [this, mode]);
  }

  /**
    Adds a highlight to buffer.

    This can be used for plugins which dynamically generate
    highlights to a buffer (like a semantic highlighter or
    linter). The function adds a single highlight to a buffer.
    Unlike matchaddpos() highlights follow changes to line
    numbering (as lines are inserted/removed above the highlighted
    line), like signs and marks do.

    "src_id" is useful for batch deletion/updating of a set of
    highlights. When called with src_id = 0, an unique source id
    is generated and returned. Succesive calls can pass in it as
    "src_id" to add new highlights to the same source group. All
    highlights in the same group can then be cleared with
    nvim_buf_clear_highlight. If the highlight never will be
    manually deleted pass in -1 for "src_id".

    If "hl_group" is the empty string no highlight is added, but a
    new src_id is still returned. This is useful for an external
    plugin to synchrounously request an unique src_id at
    initialization, and later asynchronously add and clear
    highlights in response to buffer changes. */
  addHighlight({
    hlGroup: _hlGroup,
    line,
    colStart: _start,
    colEnd: _end,
    srcId: _srcId,
    async: _isAsync,
  }: BufferHighlight): Promise<number> {
    const hlGroup = typeof _hlGroup !== 'undefined' ? _hlGroup : '';
    const colEnd = typeof _end !== 'undefined' ? _end : -1;
    const colStart = typeof _start !== 'undefined' ? _start : -0;
    const srcId = typeof _srcId !== 'undefined' ? _srcId : -1;
    return this.request(`${this.prefix}add_highlight`, [
      this,
      srcId,
      hlGroup,
      line,
      colStart,
      colEnd,
    ]);
  }

  /** Clears highlights from a given source group and a range of
  lines

  To clear a source group in the entire buffer, pass in 1 and -1
  to lineStart and lineEnd respectively. */
  clearHighlight(args: BufferClearHighlight = {}) {
    const defaults = {
      srcId: -1,
      lineStart: 0,
      lineEnd: -1,
      async: true,
    };

    const { srcId, lineStart, lineEnd } = Object.assign({}, defaults, args);

    return this.request(`${this.prefix}clear_highlight`, [
      this,
      srcId,
      lineStart,
      lineEnd,
    ]);
  }
}
