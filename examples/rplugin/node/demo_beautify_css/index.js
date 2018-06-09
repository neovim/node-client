const beautify = require('cssbeautify');

module.exports = plugin => {
  plugin.setOptions({
    dev: true,
  });

  plugin.registerCommand(
    'BeautifyCSS',
    async () => {
      try {
        const buffer = await plugin.nvim.buffer;
        const lines = await buffer.lines;
        const beautified = beautify(lines.join('\n'));
        buffer.setLines(beautified.split('\n'), {
          start: 0,
          end: -1,
          strictIndexing: true,
        });
      } catch (err) {
        console.error(err);
      }
    },
    {
      sync: false,
    }
  );
};
