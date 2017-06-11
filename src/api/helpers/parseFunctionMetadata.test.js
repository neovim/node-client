/* eslint-env jest */
const parseFunctionMetadata = require("./parseFunctionMetadata");

const prefixMap = {
  nvim_buf_: "Buffer",
  nvim_win_: "Window",
  nvim_tabpage_: "Tabpage"
};

const apis = [
  ["nvim_buf_line_count", { typeName: "Buffer", methodName: "lineCount" }],
  ["buffer_get_line", { typeName: "Buffer", methodName: "getLine" }],
  ["buffer_set_line", { typeName: "Buffer", methodName: "setLine" }],
  ["buffer_del_line", { typeName: "Buffer", methodName: "delLine" }],
  ["buffer_get_line_slice", { typeName: "Buffer", methodName: "getLineSlice" }],
  ["nvim_buf_get_lines", { typeName: "Buffer", methodName: "getLines" }],
  ["buffer_set_line_slice", { typeName: "Buffer", methodName: "setLineSlice" }],
  ["nvim_buf_set_lines", { typeName: "Buffer", methodName: "setLines" }],
  ["nvim_buf_get_var", { typeName: "Buffer", methodName: "getVar" }],
  [
    "nvim_buf_get_changedtick",
    { typeName: "Buffer", methodName: "getChangedtick" }
  ],
  ["nvim_buf_set_var", { typeName: "Buffer", methodName: "setVar" }],
  ["nvim_buf_del_var", { typeName: "Buffer", methodName: "delVar" }],
  ["buffer_set_var", { typeName: "Buffer", methodName: "setVar" }],
  ["buffer_del_var", { typeName: "Buffer", methodName: "delVar" }],
  ["nvim_buf_get_option", { typeName: "Buffer", methodName: "getOption" }],
  ["nvim_buf_set_option", { typeName: "Buffer", methodName: "setOption" }],
  ["nvim_buf_get_number", { typeName: "Buffer", methodName: "getNumber" }],
  ["nvim_buf_get_name", { typeName: "Buffer", methodName: "getName" }],
  ["nvim_buf_set_name", { typeName: "Buffer", methodName: "setName" }],
  ["nvim_buf_is_valid", { typeName: "Buffer", methodName: "isValid" }],
  ["buffer_insert", { typeName: "Buffer", methodName: "insert" }],
  ["nvim_buf_get_mark", { typeName: "Buffer", methodName: "getMark" }],
  [
    "nvim_buf_add_highlight",
    { typeName: "Buffer", methodName: "addHighlight" }
  ],
  [
    "nvim_buf_clear_highlight",
    { typeName: "Buffer", methodName: "clearHighlight" }
  ],
  ["nvim_tabpage_list_wins", { typeName: "Tabpage", methodName: "listWins" }],
  ["nvim_tabpage_get_var", { typeName: "Tabpage", methodName: "getVar" }],
  ["nvim_tabpage_set_var", { typeName: "Tabpage", methodName: "setVar" }],
  ["nvim_tabpage_del_var", { typeName: "Tabpage", methodName: "delVar" }],
  ["tabpage_set_var", { typeName: "Tabpage", methodName: "setVar" }],
  ["tabpage_del_var", { typeName: "Tabpage", methodName: "delVar" }],
  ["nvim_tabpage_get_win", { typeName: "Tabpage", methodName: "getWin" }],
  ["nvim_tabpage_get_number", { typeName: "Tabpage", methodName: "getNumber" }],
  ["nvim_tabpage_is_valid", { typeName: "Tabpage", methodName: "isValid" }],
  ["nvim_ui_attach", { typeName: "Nvim", methodName: "uiAttach" }],
  ["ui_attach", { typeName: "Ui", methodName: "uiAttach" }],
  ["nvim_ui_detach", { typeName: "Nvim", methodName: "uiDetach" }],
  ["nvim_ui_try_resize", { typeName: "Nvim", methodName: "uiTryResize" }],
  ["nvim_ui_set_option", { typeName: "Nvim", methodName: "uiSetOption" }],
  ["nvim_command", { typeName: "Nvim", methodName: "command" }],
  ["nvim_feedkeys", { typeName: "Nvim", methodName: "feedkeys" }],
  ["nvim_input", { typeName: "Nvim", methodName: "input" }],
  [
    "nvim_replace_termcodes",
    { typeName: "Nvim", methodName: "replaceTermcodes" }
  ],
  ["nvim_command_output", { typeName: "Nvim", methodName: "commandOutput" }],
  ["nvim_eval", { typeName: "Nvim", methodName: "eval" }],
  ["nvim_call_function", { typeName: "Nvim", methodName: "callFunction" }],
  ["nvim_strwidth", { typeName: "Nvim", methodName: "strwidth" }],
  [
    "nvim_list_runtime_paths",
    { typeName: "Nvim", methodName: "listRuntimePaths" }
  ],
  ["nvim_set_current_dir", { typeName: "Nvim", methodName: "setCurrentDir" }],
  ["nvim_get_current_line", { typeName: "Nvim", methodName: "getCurrentLine" }],
  ["nvim_set_current_line", { typeName: "Nvim", methodName: "setCurrentLine" }],
  ["nvim_del_current_line", { typeName: "Nvim", methodName: "delCurrentLine" }],
  ["nvim_get_var", { typeName: "Nvim", methodName: "getVar" }],
  ["nvim_set_var", { typeName: "Nvim", methodName: "setVar" }],
  ["nvim_del_var", { typeName: "Nvim", methodName: "delVar" }],
  ["vim_set_var", { typeName: "Vim", methodName: "setVar" }],
  ["vim_del_var", { typeName: "Vim", methodName: "delVar" }],
  ["nvim_get_vvar", { typeName: "Nvim", methodName: "getVvar" }],
  ["nvim_get_option", { typeName: "Nvim", methodName: "getOption" }],
  ["nvim_set_option", { typeName: "Nvim", methodName: "setOption" }],
  ["nvim_out_write", { typeName: "Nvim", methodName: "outWrite" }],
  ["nvim_err_write", { typeName: "Nvim", methodName: "errWrite" }],
  ["nvim_err_writeln", { typeName: "Nvim", methodName: "errWriteln" }],
  ["nvim_list_bufs", { typeName: "Nvim", methodName: "listBufs" }],
  ["nvim_get_current_buf", { typeName: "Nvim", methodName: "getCurrentBuf" }],
  ["nvim_set_current_buf", { typeName: "Nvim", methodName: "setCurrentBuf" }],
  ["nvim_list_wins", { typeName: "Nvim", methodName: "listWins" }],
  ["nvim_get_current_win", { typeName: "Nvim", methodName: "getCurrentWin" }],
  ["nvim_set_current_win", { typeName: "Nvim", methodName: "setCurrentWin" }],
  ["nvim_list_tabpages", { typeName: "Nvim", methodName: "listTabpages" }],
  [
    "nvim_get_current_tabpage",
    { typeName: "Nvim", methodName: "getCurrentTabpage" }
  ],
  [
    "nvim_set_current_tabpage",
    { typeName: "Nvim", methodName: "setCurrentTabpage" }
  ],
  ["nvim_subscribe", { typeName: "Nvim", methodName: "subscribe" }],
  ["nvim_unsubscribe", { typeName: "Nvim", methodName: "unsubscribe" }],
  [
    "nvim_get_color_by_name",
    { typeName: "Nvim", methodName: "getColorByName" }
  ],
  ["nvim_get_color_map", { typeName: "Nvim", methodName: "getColorMap" }],
  ["nvim_get_mode", { typeName: "Nvim", methodName: "getMode" }],
  ["nvim_get_api_info", { typeName: "Nvim", methodName: "getApiInfo" }],
  ["nvim_call_atomic", { typeName: "Nvim", methodName: "callAtomic" }],
  ["nvim_win_get_buf", { typeName: "Window", methodName: "getBuf" }],
  ["nvim_win_get_cursor", { typeName: "Window", methodName: "getCursor" }],
  ["nvim_win_set_cursor", { typeName: "Window", methodName: "setCursor" }],
  ["nvim_win_get_height", { typeName: "Window", methodName: "getHeight" }],
  ["nvim_win_set_height", { typeName: "Window", methodName: "setHeight" }],
  ["nvim_win_get_width", { typeName: "Window", methodName: "getWidth" }],
  ["nvim_win_set_width", { typeName: "Window", methodName: "setWidth" }],
  ["nvim_win_get_var", { typeName: "Window", methodName: "getVar" }],
  ["nvim_win_set_var", { typeName: "Window", methodName: "setVar" }],
  ["nvim_win_del_var", { typeName: "Window", methodName: "delVar" }],
  ["window_set_var", { typeName: "Window", methodName: "setVar" }],
  ["window_del_var", { typeName: "Window", methodName: "delVar" }],
  ["nvim_win_get_option", { typeName: "Window", methodName: "getOption" }],
  ["nvim_win_set_option", { typeName: "Window", methodName: "setOption" }],
  ["nvim_win_get_position", { typeName: "Window", methodName: "getPosition" }],
  ["nvim_win_get_tabpage", { typeName: "Window", methodName: "getTabpage" }],
  ["nvim_win_get_number", { typeName: "Window", methodName: "getNumber" }],
  ["nvim_win_is_valid", { typeName: "Window", methodName: "isValid" }],
  ["buffer_line_count", { typeName: "Buffer", methodName: "lineCount" }],
  ["buffer_get_lines", { typeName: "Buffer", methodName: "getLines" }],
  ["buffer_set_lines", { typeName: "Buffer", methodName: "setLines" }],
  ["buffer_get_var", { typeName: "Buffer", methodName: "getVar" }],
  ["buffer_get_option", { typeName: "Buffer", methodName: "getOption" }],
  ["buffer_set_option", { typeName: "Buffer", methodName: "setOption" }],
  ["buffer_get_number", { typeName: "Buffer", methodName: "getNumber" }],
  ["buffer_get_name", { typeName: "Buffer", methodName: "getName" }],
  ["buffer_set_name", { typeName: "Buffer", methodName: "setName" }],
  ["buffer_is_valid", { typeName: "Buffer", methodName: "isValid" }],
  ["buffer_get_mark", { typeName: "Buffer", methodName: "getMark" }],
  ["buffer_add_highlight", { typeName: "Buffer", methodName: "addHighlight" }],
  [
    "buffer_clear_highlight",
    { typeName: "Buffer", methodName: "clearHighlight" }
  ],
  ["tabpage_get_windows", { typeName: "Tabpage", methodName: "getWindows" }],
  ["tabpage_get_var", { typeName: "Tabpage", methodName: "getVar" }],
  ["tabpage_get_window", { typeName: "Tabpage", methodName: "getWindow" }],
  ["tabpage_is_valid", { typeName: "Tabpage", methodName: "isValid" }],
  ["ui_detach", { typeName: "Ui", methodName: "uiDetach" }],
  ["ui_try_resize", { typeName: "Ui", methodName: "uiTryResize" }],
  ["vim_command", { typeName: "Vim", methodName: "command" }],
  ["vim_feedkeys", { typeName: "Vim", methodName: "feedkeys" }],
  ["vim_input", { typeName: "Vim", methodName: "input" }],
  [
    "vim_replace_termcodes",
    { typeName: "Vim", methodName: "replaceTermcodes" }
  ],
  ["vim_command_output", { typeName: "Vim", methodName: "commandOutput" }],
  ["vim_eval", { typeName: "Vim", methodName: "eval" }],
  ["vim_call_function", { typeName: "Vim", methodName: "callFunction" }],
  ["vim_strwidth", { typeName: "Vim", methodName: "strwidth" }],
  [
    "vim_list_runtime_paths",
    { typeName: "Vim", methodName: "listRuntimePaths" }
  ],
  ["vim_change_directory", { typeName: "Vim", methodName: "changeDirectory" }],
  ["vim_get_current_line", { typeName: "Vim", methodName: "getCurrentLine" }],
  ["vim_set_current_line", { typeName: "Vim", methodName: "setCurrentLine" }],
  ["vim_del_current_line", { typeName: "Vim", methodName: "delCurrentLine" }],
  ["vim_get_var", { typeName: "Vim", methodName: "getVar" }],
  ["vim_get_vvar", { typeName: "Vim", methodName: "getVvar" }],
  ["vim_get_option", { typeName: "Vim", methodName: "getOption" }],
  ["vim_set_option", { typeName: "Vim", methodName: "setOption" }],
  ["vim_out_write", { typeName: "Vim", methodName: "outWrite" }],
  ["vim_err_write", { typeName: "Vim", methodName: "errWrite" }],
  ["vim_report_error", { typeName: "Vim", methodName: "reportError" }],
  ["vim_get_buffers", { typeName: "Vim", methodName: "getBuffers" }],
  [
    "vim_get_current_buffer",
    { typeName: "Vim", methodName: "getCurrentBuffer" }
  ],
  [
    "vim_set_current_buffer",
    { typeName: "Vim", methodName: "setCurrentBuffer" }
  ],
  ["vim_get_windows", { typeName: "Vim", methodName: "getWindows" }],
  [
    "vim_get_current_window",
    { typeName: "Vim", methodName: "getCurrentWindow" }
  ],
  [
    "vim_set_current_window",
    { typeName: "Vim", methodName: "setCurrentWindow" }
  ],
  ["vim_get_tabpages", { typeName: "Vim", methodName: "getTabpages" }],
  [
    "vim_get_current_tabpage",
    { typeName: "Vim", methodName: "getCurrentTabpage" }
  ],
  [
    "vim_set_current_tabpage",
    { typeName: "Vim", methodName: "setCurrentTabpage" }
  ],
  ["vim_subscribe", { typeName: "Vim", methodName: "subscribe" }],
  ["vim_unsubscribe", { typeName: "Vim", methodName: "unsubscribe" }],
  ["vim_name_to_color", { typeName: "Vim", methodName: "nameToColor" }],
  ["vim_get_color_map", { typeName: "Vim", methodName: "getColorMap" }],
  ["vim_get_api_info", { typeName: "Vim", methodName: "getApiInfo" }],
  ["window_get_buffer", { typeName: "Window", methodName: "getBuffer" }],
  ["window_get_cursor", { typeName: "Window", methodName: "getCursor" }],
  ["window_set_cursor", { typeName: "Window", methodName: "setCursor" }],
  ["window_get_height", { typeName: "Window", methodName: "getHeight" }],
  ["window_set_height", { typeName: "Window", methodName: "setHeight" }],
  ["window_get_width", { typeName: "Window", methodName: "getWidth" }],
  ["window_set_width", { typeName: "Window", methodName: "setWidth" }],
  ["window_get_var", { typeName: "Window", methodName: "getVar" }],
  ["window_get_option", { typeName: "Window", methodName: "getOption" }],
  ["window_set_option", { typeName: "Window", methodName: "setOption" }],
  ["window_get_position", { typeName: "Window", methodName: "getPosition" }],
  ["window_get_tabpage", { typeName: "Window", methodName: "getTabpage" }],
  ["window_is_valid", { typeName: "Window", methodName: "isValid" }]
];

describe("parseFunctionMetadata", () => {
  apis.forEach(([nvimApi, expected]) => {
    it(nvimApi, () => {
      expect(parseFunctionMetadata({ prefixMap, name: nvimApi })).toEqual(
        expected
      );
    });
  });
});
