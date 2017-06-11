const attach = require('./attach');
const plugin = require('./plugin');

module.exports = {
  attach,
  plugin,
};

// Default export will be plugin interface
module.exports.default = plugin;
