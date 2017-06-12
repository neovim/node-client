const util = require('util');

const attach = require('../attach');
const logger = require('../logger');
const loadPlugin = require('./factory');

class Host {
  constructor() {
    // Map for loaded plugins
    this.loaded = {};
    this.handler = this.handler.bind(this);
    this.handlePlugin = this.handlePlugin.bind(this);
  }

  getPlugin(filename, options) {
    const plugin =
      this.loaded[filename] || loadPlugin(filename, this.nvim, options);

    if (plugin && plugin.shouldCache) {
      this.loaded[filename] = plugin;
    }

    return plugin;
  }

  // Route incoming request to a plugin
  handlePlugin(method, args) {
    return new Promise((resolve, reject) => {
      logger.debug('host.handlePlugin: ', method);

      // Parse method name
      const procInfo = method.split(':');
      const filename = procInfo[0];
      const type = procInfo[1];
      const procName = `"${procInfo.slice(2).join(' ')}"`;

      const plugin = this.getPlugin(filename);

      if (!plugin) {
        const msg = `Could not load plugin: ${filename}`;
        reject(new Error(msg));
        logger.error(msg);
      } else if (plugin.module) {
        const handler = plugin.handlers[method];
        if (typeof plugin.module[handler] !== 'function') {
          const errMsg = `Missing handler for ${type}: "${procName}" in ${filename}`;
          logger.error(errMsg);
          reject(new Error(errMsg));
        } else {
          try {
            resolve(plugin.module[handler](...args));
          } catch (err) {
            const msg = `Error in plugin for ${type}:${procName}: ${err.message}`;
            logger.error(`${msg} (file: ${filename}, stack: ${err.stack})`);
            reject(new Error(msg));
          }
        }
      }
    });
  }

  handleRequestSpecs(method, args, res) {
    const filename = args[0];
    logger.debug(`requested specs for ${filename}`);
    // Can return null if there is nothing defined in plugin
    const plugin = this.getPlugin(filename, { noCreateInstance: true });
    const specs = (plugin && plugin.specs) || [];
    res.send(specs);
    logger.debug(`specs: ${util.inspect(specs)}`);
  }

  handler(method, args, res) {
    logger.debug('request received: ', method);
    // 'poll' and 'specs' are requests by neovim,
    // otherwise it will
    if (method === 'poll') {
      // Handshake for neovim
      res.send('ok');
    } else if (method === 'specs') {
      // Return plugin specs
      this.handleRequestSpecs(method, args, res);
    } else {
      this.handlePlugin(method, args, (err, plugRes) => {
        if (err) {
          res.send(err.toString(), true);
        } else {
          res.send(!plugRes || typeof plugRes === 'undefined' ? null : plugRes);
        }
      });
    }
  }

  async start({ proc }) {
    // stdio is reversed since it's from the perspective of Neovim
    logger.debug('host.start');
    const nvim = attach({ writer: proc.stdout, reader: proc.stdin });
    this.nvim = nvim;

    if (nvim) {
      nvim.on('request', this.handler);
      nvim.on('notification', this.handlePlugin);
      nvim.on('disconnect', () => {
        logger.debug('host.disconnected');
      });
    }
  }
}

module.exports = Host;
