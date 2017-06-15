const BaseApi = require('./Base');

class Buffer extends BaseApi {
  // @return Integer
  get length() {
    return this.request(`${this.prefix}line_count`, [this]);
  }

  // @return Array<string>
  get lines() {
    return this.request(`${this.prefix}get_lines`, [this, 0, -1, true]);
  }

  // Buffer name
  // @return string
  get name() {
    return this.request(`${this.prefix}get_name`, [this]);
  }

  set name(value) {
    return this.request(`${this.prefix}set_name`, [this, value]);
  }

  // Is current buffer valid
  // @return boolean
  get valid() {
    return this.request(`${this.prefix}is_valid`, [this]);
  }

  // Append a string or list of lines to end of buffer
  append(_lines, index = -1) {
    const lines = typeof _lines === 'string' ? [_lines] : _lines;
    this.request('nvim_buf_set_lines', this, index, index, true, lines);
  }

  // @return [rol, col]
  mark(name) {
    return this.request('nvim_buf_get_mark', name);
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
      'nvim_buf_add_highlight',
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
    this.request('nvim_buf_clear_highlight', srcId, lineStart, lineEnd, async);
  }
}

module.exports = Buffer;
