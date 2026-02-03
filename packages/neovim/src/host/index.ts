import { attach } from '../attach/attach';
import { loadPlugin, LoadPluginOptions } from './factory';
import { NvimPlugin } from './NvimPlugin';

export interface Response {
  send(resp: any, isError?: boolean): void;
}

/**
 * @deprecated Eliminate the "host" concept. https://github.com/neovim/neovim/issues/27949
 */
export class Host {
  public loaded: { [index: string]: NvimPlugin };

  public nvim?: ReturnType<typeof attach>;

  constructor() {
    // Map for loaded plugins
    this.loaded = {};
    this.handler = this.handler.bind(this);
    this.handlePlugin = this.handlePlugin.bind(this);
  }

  getPlugin(filename: string, options: LoadPluginOptions = {}) {
    let plugin: (typeof this.loaded)[0] | null = this.loaded[filename];
    const shouldUseCachedPlugin = plugin && plugin.shouldCacheModule && !plugin.alwaysInit;

    if (shouldUseCachedPlugin) {
      this.nvim?.logger.debug('getPlugin.useCachedPlugin');
      return plugin;
    }

    if (!this.nvim) {
      throw Error();
    }
    plugin = loadPlugin(filename, this.nvim, {
      ...options,
      cache: plugin && plugin.shouldCacheModule,
    });

    this.nvim.logger.debug('getPlugin.alwaysInit', plugin && !plugin.alwaysInit);
    if (plugin) {
      this.loaded[filename] = plugin;
    }

    return plugin;
  }

  // Route incoming request to a plugin
  async handlePlugin(method: string, args: any[]) {
    // ignore methods that start with nvim_ prefix (e.g. when attaching to buffer and listening for notifications)
    if (method.startsWith('nvim_')) {
      return null;
    }
    this.nvim?.logger.debug('host.handlePlugin: %s', method);

    // Parse method name
    const procInfo = method.split(':');
    if (process.platform === 'win32') {
      // Windows-style absolute paths is formatted as [A-Z]:\path\to\file.
      // Forward slash as path separator is ok
      // so Neovim uses it to avoid escaping backslashes.
      //
      // For absolute path of cmd.exe with forward slash as path separator,
      // method.split(':') returns ['C', '/Windows/System32/cmd.exe', ...].
      // procInfo should be ['C:/Windows/System32/cmd.exe', ...].
      const networkDrive = procInfo.shift();
      procInfo[0] = `${networkDrive}:${procInfo[0]}`;
    }
    const filename = procInfo[0];
    const type = procInfo[1];
    const procName = `${procInfo.slice(2).join(' ')}`;

    const plugin = this.getPlugin(filename);

    if (!plugin) {
      const msg = `Could not load plugin: ${filename}`;
      this.nvim?.logger.error(msg);
      throw new Error(msg);
    }

    return plugin.handleRequest(procName, type, args);
  }

  handleRequestSpecs(_method: string, args: any[], res: Response) {
    const filename = args[0];
    this.nvim?.logger.debug(`requested specs for ${filename}`);
    // Can return null if there is nothing defined in plugin
    const plugin = this.getPlugin(filename);
    const specs = (plugin && plugin.specs) || [];
    this.nvim?.logger.debug(JSON.stringify(specs));
    res.send(specs);
    this.nvim?.logger.debug('specs: %O', specs);
  }

  async handler(method: string, args: any[], res: Response) {
    this.nvim?.logger.debug('request received: %s', method);
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
        const plugResult = await this.handlePlugin(method, args);
        res.send(!plugResult || typeof plugResult === 'undefined' ? null : plugResult);
      } catch (e) {
        const err = e as Error;
        res.send(err.toString(), true);
      }
    }
  }

  async start({ proc }: { proc: NodeJS.Process }) {
    // stdio is reversed since it's from the perspective of Neovim
    const nvim = attach({ reader: proc.stdin, writer: proc.stdout });
    this.nvim = nvim;
    this.nvim.logger.debug('host.start');

    nvim.on('request', this.handler);
    nvim.on('notification', this.handlePlugin);
    nvim.on('disconnect', () => {
      this.nvim?.logger.debug('host.disconnected');
    });
  }
}
