# Neovim node.js client

| CI (node >= 14, Linux/macOS/Windows) | Coverage | npm |
|----------------------------|----------|-----|
| [![ci](https://github.com/neovim/node-client/actions/workflows/ci.yml/badge.svg)](https://github.com/neovim/node-client/actions/workflows/ci.yml) | [![Coverage Badge][]][Coverage Report] | [![npm version][]][npm package] |

## Install

For "remote plugins", the Nvim [Node.js provider](https://neovim.io/doc/user/provider.html#provider-nodejs) expects the `neovim` package to be globally installed:

```bash
npm install -g neovim
```

Or for non-plugin purposes, `neovim` works like any other NPM package.
See below for a quickstart example that you can copy and run immediately.

## Usage

### Functions

The `neovim` package provides these functions:

- `attach()`: The primary interface. Takes a process, socket, or pair of write/read streams and returns a `NeovimClient` connected to an `nvim` process.
- `findNvim()`: Tries to find a usable `nvim` binary on the current system.

### Logging

- At load-time, the `neovim` module replaces ("monkey patches") `console` with its `logger`
  interface, so `console.log` will call `logger.info` instead of writing to stdout (which would
  break the stdio RPC channel).
    - To skip this patching of `console.log`, pass a custom `logger` to `attach()`.
    - Best practice in any case is to use the `logger` available from the `NeovimClient` returned by
      `attach()`, instead of `console` logging functions.
- Set the `$NVIM_NODE_LOG_FILE` env var to (also) write logs to a file.
- Set the `$ALLOW_CONSOLE` env var to (also) write logs to stdout.

### Quickstart: connect to Nvim

Following is a complete, working example.

1. Install the `neovim` package _locally_ in any directory (i.e. without `-g`. Node throws `ERR_MODULE_NOT_FOUND` if a script imports a _globally_ installed package).
   ```bash
   npm install neovim
   ```
2. Paste the script below into a `demo.mjs` file and run it!
   ```
   ALLOW_CONSOLE=1 node demo.mjs
   ```
    - `$ALLOW_CONSOLE` env var must be set, because logs are normally not printed to stdout.
    - Script:
     ```js
     import * as child_process from 'node:child_process'
     import * as assert from 'node:assert'
     import { attach, findNvim } from 'neovim'

     // Find `nvim` on the system and open a channel to it.
     (async function() {
       const found = findNvim({ orderBy: 'desc', minVersion: '0.9.0' })
       console.log(found);
       const nvim_proc = child_process.spawn(found.matches[0].path, ['--clean', '--embed'], {});
       const nvim = attach({ proc: nvim_proc });

       nvim.command('vsp | vsp | vsp');

       const windows = await nvim.windows;
       assert.deepStrictEqual(windows.length, 4);
       assert.ok(windows[0] instanceof nvim.Window);

       nvim.window = windows[2];
       const win = await nvim.window;
       assert.ok(win.id !== windows[0].id);
       assert.deepStrictEqual(win.id, windows[2].id);

       const buf = await nvim.buffer;
       assert.ok(buf instanceof nvim.Buffer);
       const lines = await buf.lines;
       assert.deepStrictEqual(lines, []);

       await buf.replace(['line1', 'line2'], 0);
       const newLines = await buf.lines;
       assert.deepStrictEqual(newLines, ['line1', 'line2']);

       if (nvim_proc.disconnect) {
         nvim_proc.disconnect();
       }
       nvim.quit();
       while (nvim_proc.exitCode === null) {
         await new Promise(resolve => setTimeout(resolve, 100))
         console.log('waiting for Nvim (pid %d) to exit', nvim_proc.pid);
       }
       console.log('Nvim exit code: %d', nvim_proc.exitCode);
     })();
     ```

### Create a remote plugin

Neovim supports [remote plugins](https://neovim.io/doc/user/remote_plugin.html), which are plugins implemented as Nvim API clients.
This package contains both the "API client" (which talks to nvim) and "remote plugin host" (which discovers and runs Nvim node.js remote plugins).

You can define a remote plugin as a file or folder in an `rplugin/node/` directory on Nvim's ['runtimepath'](https://neovim.io/doc/user/options.html#'runtimepath').
If the plugin is a folder, the `main` script from `package.json` will be loaded.

The plugin must export a function which takes a `NvimPlugin` object as its only parameter. You may then register autocmds, commands and functions by calling methods on the `NvimPlugin` object.
**Avoid heavy initialisation or async functions at this stage,** because Nvim may only be collecting information about your plugin without wishing to actually use it.
Instead, wait for one of your autocmds, commands or functions to be called before starting any processing.

### Remote plugin examples

See [`examples/`](https://github.com/neovim/node-client/tree/master/examples) for remote plugin examples.

### Remote plugin API

```ts
  NvimPlugin.nvim
```

This is the nvim api object you can use to send commands from your plugin to nvim.

```ts
  NvimPlugin.setOptions(options: NvimPluginOptions);

  interface NvimPluginOptions {
    dev?: boolean;
    alwaysInit?: boolean;
  }
```

Set your plugin to dev mode, which will cause the module to be reloaded on each invocation.
`alwaysInit` will always attempt to attempt to re-instantiate the plugin. e.g. your plugin class will
always get called on each invocation of your plugin's command.


```ts
  NvimPlugin.registerAutocmd(name: string, fn: Function, options: AutocmdOptions): void;
  NvimPlugin.registerAutocmd(name: string, fn: [any, Function], options: AutocmdOptions): void;

  interface AutocmdOptions {
    pattern: string;  // See `:help autocmd-pattern`.
    eval?: string;    // Vimscript expression evaluated by the Nvim peer.
    sync?: boolean;   // Force blocking (non-async) behavior.
  }
```

Registers an autocmd for the event `name`, calling your function `fn` with `options`. Pattern is the only required option. If you wish to call a method on an object you may pass `fn` as an array of `[object, object.method]`.

By default autocmds, commands and functions are all treated as asynchronous and should return `Promises` (or should be `async` functions).

```ts
  NvimPlugin.registerCommand(name: string, fn: Function, options?: CommandOptions): void;
  NvimPlugin.registerCommand(name: string, fn: [any, Function], options?: CommandOptions): void;

  interface CommandOptions {
    sync?: boolean;   // Force blocking (non-async) behavior.
    range?: string;   // See `:help :range`.
    nargs?: string;   // See `:help :command-nargs`.
  }
```

Registers a command named by `name`, calling function `fn` with `options`. This will be invoked from nvim by entering `:name` in normal mode.

```ts
  NvimPlugin.registerFunction(name: string, fn: Function, options?: NvimFunctionOptions): void;
  NvimPlugin.registerFunction(name: string, fn: [any, Function], options?: NvimFunctionOptions): void;

  interface NvimFunctionOptions {
    sync?: boolean;   // Force blocking (non-async) behavior.
    range?: string;   // See `:help :range`.
    eval?: string;    // Vimscript expression evaluated by the Nvim peer.
  }
```

Registers a function with name `name`, calling function `fn` with `options`. This will be invoked from nvim by entering eg `:call name()` in normal mode.

## Debug / troubleshoot

For debugging and configuring logging, you can set the following environment variables which are used by the `neovim` package (or `nvim` itself where noted):

- `NVIM_NODE_HOST_DEBUG`: Spawns the node process that calls `neovim-client-host` with `--inspect-brk` so you can have a debugger.
  Pair that with this [Node Inspector Manager Chrome plugin](https://chrome.google.com/webstore/detail/nodejs-v8-inspector-manag/gnhhdgbaldcilmgcpfddgdbkhjohddkj?hl=en)
- Logging: Logging is done using `winston` through the `logger` module. This package replaces `console` with this interface.
    - `NVIM_NODE_LOG_LEVEL`: Sets the logging level for winston. Default is `debug`.
      Available levels: `{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }`
    - `NVIM_NODE_LOG_FILE`: Sets the log file path.
- Usage through node REPL
    - `NVIM_LISTEN_ADDRESS`:
        1. Start Nvim with a known address (or use the $NVIM_LISTEN_ADDRESS of a running instance):
           ```
           $ NVIM_LISTEN_ADDRESS=/tmp/nvim nvim
           ```
        2. In another terminal, connect a node REPL to Nvim
           ```javascript
           // `scripts/nvim` will detect if `NVIM_LISTEN_ADDRESS` is set and use that unix socket
           // Otherwise will create an embedded `nvim` instance
           require('neovim/scripts/nvim').then((nvim) => {
             nvim.command('vsp');
           });
           ```

See the tests and [`scripts`](https://github.com/neovim/node-client/tree/master/packages/neovim/scripts) for more examples.

## Develop

After cloning the repo, run `npm install` to install dev dependencies. The main `neovim` library is in `packages/neovim`.

### Run tests

    npm run build && NVIM_NODE_LOG_FILE=log npm run test

## Maintain

### Release

Only maintainers of the [neovim NPM package](https://www.npmjs.com/package/neovim) can publish a release. Follow these steps to publish a release:

1. Update `CHANGELOG.md`.
2. Update version. Build and publish the package. Tag the release and push.
   ```bash
   # Choose major/minor/patch as needed.
   npm version -w packages/neovim/ patch
   git commit -m 'release'
   # Note: this copies the top-level README.md/CHANGELOG.md to packages/neovim/.
   npm run publish:neovim
   export _VERSION=$(grep -o 'version": "[^"]\+' packages/neovim/package.json | sed 's/.*"//')
   git tag "v${_VERSION}"
   git push --follow-tags
   ```
3. Post-release tasks:
   ```bash
   npm version -w packages/neovim/ --no-git-tag-version prerelease --preid dev
   git add packages/*/package.json package*.json && git commit -m bump
   git push
   ```

### Regenerate documentation website

The docs website is currently not automated. Follow these steps to regenerate it:

```bash
npm run doc -w packages/neovim
git checkout gh-pages
mv -f packages/neovim/doc/assets/* assets/
mv -f packages/neovim/doc/classes/* classes/
mv -f packages/neovim/doc/functions/* functions/
mv -f packages/neovim/doc/types/* types/
mv packages/neovim/doc/* .
rm -r packages/
git add *
git commit -m 'publish docs'
git push origin HEAD:gh-pages
```

## Contributors

* [@billyvg](https://github.com/billyvg) for rewrite
* [@mhartington](https://github.com/mhartington) for TypeScript rewrite
* [@fritzy](https://github.com/fritzy) for transferring over the npm package repo `neovim`!
* [@rhysd](https://github.com/rhysd), [@tarruda](https://github.com/tarruda), [@nhynes](https://github.com/nhynes) on work for the original `node-client`
* [@justinmk](https://github.com/justinmk) Neovim maintainer

[Coverage Badge]: https://codecov.io/gh/neovim/node-client/branch/master/graph/badge.svg
[Coverage Report]: https://codecov.io/gh/neovim/node-client
[npm version]: https://img.shields.io/npm/v/neovim.svg
[npm package]: https://www.npmjs.com/package/neovim
