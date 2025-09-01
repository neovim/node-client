import { BaseApi } from './Base';
import { ExtType, Metadata, Promisify } from './types';

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
}

export interface BufferClearHighlight {
  srcId?: number;
  lineStart?: number;
  lineEnd?: number;
}

export interface BufferClearNamespace {
  nsId?: number;
  lineStart?: number;
  lineEnd?: number;
}

export type VirtualTextChunk = [string, string];

export const DETACH = Symbol('detachBuffer');
export const ATTACH = Symbol('attachBuffer');

export class Buffer extends BaseApi {
  public override prefix: string = Metadata[ExtType.Buffer].prefix;

  public get isAttached(): boolean {
    return this.client.isAttached(this);
  }

  /**
   * Attach to buffer to listen to buffer events
   * @param sendBuffer Set to true if the initial notification should contain
   *        the whole buffer. If so, the first notification will be a
   *        `nvim_buf_lines_event`. Otherwise, the first notification will be
   *        a `nvim_buf_changedtick_event`
   */
  [ATTACH] = async (sendBuffer = false, options: {} = {}): Promise<boolean> => {
    if (this.client.isAttached(this)) {
      return true;
    }
    return this.request(`${this.prefix}attach`, [this, sendBuffer, options]);
  };

  /**
   * Detach from buffer to stop listening to buffer events
   */
  [DETACH] = () => this.request(`${this.prefix}detach`, [this]);

  /**
   * Get the bufnr of Buffer
   */
  get id(): number {
    return this.data as number;
  }

  /** Total number of lines in buffer */
  get length(): Promise<number> {
    return this.request(`${this.prefix}line_count`, [this]);
  }

  /** Get lines in buffer */
  get lines(): Promise<string[]> {
    return this.getLines();
  }

  /** Gets a changed tick of a buffer */
  get changedtick(): Promise<number> {
    return this.request(`${this.prefix}get_changedtick`, [this]);
  }

  get commands(): Promise<Record<string, any>> {
    return this.getCommands();
  }

  getCommands(options = {}): Promise<Record<string, any>> {
    return this.request(`${this.prefix}get_commands`, [this, options]);
  }

  /** Get specific lines of buffer */
  getLines(
    { start, end, strictIndexing } = { start: 0, end: -1, strictIndexing: true }
  ): Promise<string[]> {
    const indexing = typeof strictIndexing === 'undefined' ? true : strictIndexing;
    return this.request(`${this.prefix}get_lines`, [this, start, end, indexing]);
  }

  /** Set lines of buffer given indeces */
  setLines(
    _lines: string | string[],
    { start: _start, end: _end, strictIndexing }: BufferSetLines = {
      strictIndexing: true,
    }
  ) {
    if (_start === undefined || _end === undefined) {
      throw new Error('start and end are required');
    }
    const indexing = typeof strictIndexing === 'undefined' ? true : strictIndexing;
    const lines = typeof _lines === 'string' ? [_lines] : _lines;
    const end = typeof _end !== 'undefined' ? _end : _start + 1;

    return this.request(`${this.prefix}set_lines`, [this, _start, end, indexing, lines]);
  }

  /** Insert lines at `start` index */
  insert(lines: string[] | string, start: number) {
    return this.setLines(lines, {
      start,
      end: start,
      strictIndexing: true,
    });
  }

  /** Replace lines starting at `start` index */
  replace(_lines: string[] | string, start: number) {
    const lines = typeof _lines === 'string' ? [_lines] : _lines;
    return this.setLines(lines, {
      start,
      end: start + lines.length,
      strictIndexing: false,
    });
  }

  /** Remove lines at index */
  remove(start: number, end: number, strictIndexing: boolean) {
    return this.setLines([], { start, end, strictIndexing });
  }

  /** Append a string or list of lines to end of buffer */
  append(lines: string[] | string) {
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

  /**
   * Gets a list of buffer-local |mapping| definitions.
   */
  getKeymap(mode: string): Promise<object[]> {
    return this.request(`${this.prefix}get_keymap`, [this, mode]);
  }

  /**
   * Checks if a buffer is valid and loaded. See |api-buffer| for
   * more info about unloaded buffers.
   */
  get loaded(): Promise<boolean> {
    return this.request(`${this.prefix}is_loaded`, [this]);
  }

  /**
   * Returns the byte offset for a line.
   *
   * Line 1 (index=0) has offset 0. UTF-8 bytes are counted. EOL is
   * one byte. 'fileformat' and 'fileencoding' are ignored. The
   * line index just after the last line gives the total byte-count
   * of the buffer. A final EOL byte is counted if it would be
   * written, see 'eol'.
   *
   * Unlike |line2byte()|, throws error for out-of-bounds indexing.
   * Returns -1 for unloaded buffer.
   *
   * @return {Number} Integer byte offset, or -1 for unloaded buffer.
   */
  getOffset(index: number): Promise<number> {
    return this.request(`${this.prefix}get_offset`, [this, index]);
  }

  /**
   * Adds a highlight to buffer.
   *
   * Useful for plugins that dynamically generate highlights to a
   * buffer (like a semantic highlighter or linter). The function
   * adds a single highlight to a buffer. Unlike |matchaddpos()|
   * highlights follow changes to line numbering (as lines are
   * inserted/removed above the highlighted line), like signs and
   * marks do.
   *
   * Namespaces are used for batch deletion/updating of a set of
   * highlights. To create a namespace, use |nvim_create_namespace|
   * which returns a namespace id. Pass it in to this function as
   * `ns_id` to add highlights to the namespace. All highlights in
   * the same namespace can then be cleared with single call to
   * |nvim_buf_clear_namespace|. If the highlight never will be
   * deleted by an API call, pass `ns_id = -1`.
   *
   * As a shorthand, `ns_id = 0` can be used to create a new
   * namespace for the highlight, the allocated id is then
   * returned. If `hl_group` is the empty string no highlight is
   * added, but a new `ns_id` is still returned. This is supported
   * for backwards compatibility, new code should use
   * |nvim_create_namespace| to create a new empty namespace.
   */
  addHighlight({
    hlGroup: _hlGroup,
    line,
    colStart: _start,
    colEnd: _end,
    srcId: _srcId,
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

  /**
   * Deprecated
   */
  clearHighlight(args: BufferClearHighlight = {}) {
    // eslint-disable-next-line no-console
    console.warn('`clearHighlight` is deprecated, use ``clearNamespace()` instead');

    const defaults = {
      srcId: -1,
      lineStart: 0,
      lineEnd: -1,
    };

    const { srcId, lineStart, lineEnd } = { ...defaults, ...args };

    return this.request(`${this.prefix}clear_highlight`, [this, srcId, lineStart, lineEnd]);
  }

  /**
   * Clears namespaced objects, highlights and virtual text, from a line range
   *
   * To clear the namespace in the entire buffer, pass in 0 and -1 to line_start and line_end respectively.
   *
   * @param {Number} nsId Namespace to clear, or -1 to clear all namespaces
   * @param {Number} lineStart Start of range of lines to clear
   * @param {Number} lineEnd End of range of lines to clear (exclusive) or -1 to clear to end of buffer
   */
  clearNamespace(args: BufferClearNamespace): void {
    const defaults = {
      nsId: -1,
      lineStart: 0,
      lineEnd: -1,
    };

    const { nsId, lineStart, lineEnd } = { ...defaults, ...args };

    this.request(`${this.prefix}clear_namespace`, [this, nsId, lineStart, lineEnd]);
  }

  /**
   * Set the virtual text (annotation) for a buffer line.
   *
   * By default (and currently the only option) the text will be
   * placed after the buffer text. Virtual text will never cause
   * reflow, rather virtual text will be truncated at the end of
   * the screen line. The virtual text will begin one cell
   * (|lcs-eol| or space) after the ordinary text.
   *
   * Namespaces are used to support batch deletion/updating of
   * virtual text. To create a namespace, use
   * |nvim_create_namespace|. Virtual text is cleared using
   * |nvim_buf_clear_namespace|. The same `ns_id` can be used for
   * both virtual text and highlights added by
   * |nvim_buf_add_highlight|, both can then be cleared with a
   * single call to |nvim_buf_clear_namespace|. If the virtual text
   * never will be cleared by an API call, pass `ns_id = -1`.
   *
   * As a shorthand, `ns_id = 0` can be used to create a new
   * namespace for the virtual text, the allocated id is then
   * returned.
   *
   * @param
   * @param {Number} nsId Namespace to use or 0 to create a namespace, or -1 for a ungrouped annotation
   * @param {Number} line Line to annotate with virtual text (zero-indexed)
   * @param {VirtualTextChunk[]} chunks  A list of [text, hl_group] arrays, each
                              representing a text chunk with specified
                              highlight. `hl_group` element can be omitted for
                              no highlight.
   * @param {Object} opts Optional parameters. Currently not used.
   */
  setVirtualText(
    nsId: number,
    line: number,
    chunks: VirtualTextChunk[],
    opts = {}
  ): Promise<number> {
    return this.request(`${this.prefix}set_virtual_text`, [this, nsId, line, chunks, opts]);
  }

  /**
   * Listens to buffer for events
   */
  listen(eventName: string, cb: Function): Function {
    if (!this.isAttached) {
      this[ATTACH]().then(attached => {
        if (!attached) {
          this.unlisten(eventName, cb);
        }
      });
    }

    this.client.attachBuffer(this, eventName, cb);
    return () => {
      this.unlisten(eventName, cb);
    };
  }

  unlisten(eventName: string, cb: Function): void {
    if (!this.isAttached) {
      return;
    }
    const shouldDetach = this.client.detachBuffer(this, eventName, cb);
    if (!shouldDetach) {
      return;
    }
    this[DETACH]();
  }
}

export interface AsyncBuffer extends Promisify<Buffer>, Promise<Buffer> {}
