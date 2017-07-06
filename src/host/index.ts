import * as util from 'util';
import { attach } from '../attach';
import { logger } from '../utils/logger';
import { loadPlugin, LoadPluginOptions } from './factory';

export interface Response {
  send(resp: any, isError?: boolean): void;
}

export class Host {
  public loaded: any;
  public nvim: any;

  constructor() {
    // Map for loaded plugins
    this.loaded = {};
    this.handler = this.handler.bind(this);
    this.handlePlugin = this.handlePlugin.bind(this);
  }

  getPlugin(filename: string, options: LoadPluginOptions = null) {
    const plugin =
      this.loaded[filename] || loadPlugin(filename, this.nvim, options);

    logger.debug('getPlugin.shouldCache', plugin && plugin.shouldCache);
    if (plugin && plugin.shouldCache) {
      this.loaded[filename] = plugin;
    }

    return plugin;
  }

  // Route incoming request to a plugin
  handlePlugin(method: string, args: any[]) {
    return new Promise(async (resolve, reject) => {
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
            resolve(await plugin.module[handler](...args));
          } catch (err) {
            const msg = `Error in plugin for ${type}:${procName}: ${err.message}`;
            logger.error(`${msg} (file: ${filename}, stack: ${err.stack})`);
            reject(err);
          }
        }
      }
    });
  }

  handleRequestSpecs(method: string, args: any[], res: Response) {
    const filename = args[0];
    logger.debug(`requested specs for ${filename}`);
    // Can return null if there is nothing defined in plugin
    const plugin = this.getPlugin(filename, { noCreateInstance: true });
    const specs = (plugin && plugin.specs) || [];
    res.send(specs);
    logger.debug(`specs: ${util.inspect(specs)}`);
  }

  async handler(method: string, args: any[], res: Response) {
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
      try {
        // TODO check if sync
        const plugResult = await this.handlePlugin(method, args);
        res.send(
          !plugResult || typeof plugResult === 'undefined' ? null : plugResult
        );
      } catch (err) {
        res.send(err.toString(), true);
      }
    }
  }

  async start({ proc }: { proc: NodeJS.Process }) {
    // stdio is reversed since it's from the perspective of Neovim
    logger.debug('host.start');
    const nvim = attach({ reader: proc.stdin, writer: proc.stdout });
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
