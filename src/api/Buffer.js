const BaseApi = require('./Base');

class Buffer extends BaseApi {
  // @return Promise<Integer>
  get length() {
    return this.request(`${this.prefix}line_count`, [this]);
  }

  // @return Promise<Array<string>>
  get lines() {
    return this.getLines();
  }

  // Get lines
  // @return Promise<Array<string>>
  getLines(
    { start, end, strictIndexing } = { start: 0, end: -1, strictIndexing: true }
  ) {
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
    _lines,
    { start: _start, end: _end, strictIndexing } = { strictIndexing: true }
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
  insert(lines, start) {
    return this.setLines(lines, { start, end: start, strictIndexing: true });
  }

  // Replace lines starting at `start` index
  replace(_lines, start) {
    const lines = typeof _lines === 'string' ? [_lines] : _lines;
    return this.setLines(lines, {
      start,
      end: start + lines.length + 1,
      strictIndexing: false,
    });
  }

  remove(start, end, strictIndexing) {
    return this.setLines([], { start, end, strictIndexing });
  }

  // Append a string or list of lines to end of buffer
  append(lines) {
    return this.setLines(lines, { start: -1, end: -1, strictIndexing: false });
  }

  // Buffer name
  // @return Promise<string>
  get name() {
    return this.request(`${this.prefix}get_name`, [this]);
  }

  set name(value) {
    return this.request(`${this.prefix}set_name`, [this, value]);
  }

  // Is current buffer valid
  // @return Promise<boolean>
  get valid() {
    return this.request(`${this.prefix}is_valid`, [this]);
  }

  // @return Promise<[rol, col]>
  mark(name) {
    return this.request(`${this.prefix}get_mark`, name);
  }

  // range(start, end) {
  // """Return a `Range` object, which represents part of the Buffer."""
  // return Range(this, start, end)
  // }

  addHighlight(
    { hlGroup, line, colStart, colEnd, srcId, async: _isAsync } = {
      colStart: 0,
      colEnd: -1,
      srcId: -1,
    }
  ) {
    const isAsync = _isAsync || typeof srcId !== 'undefined';
    return this.request(
      `${this.prefix}add_highlight`,
      srcId,
      hlGroup,
      line,
      colStart,
      colEnd,
      isAsync
    );
  }

  clearHighlight(
    { srcId, lineStart, lineEnd, async } = {
      lineStart: 0,
      lineEnd: -1,
      async: true,
    }
  ) {
    return this.request(
      `${this.prefix}clear_highlight`,
      srcId,
      lineStart,
      lineEnd,
      async
    );
  }
}

module.exports = Buffer;
