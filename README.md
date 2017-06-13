# neovim-client [![Build Status](https://travis-ci.org/billyvg/node-client.svg?branch)](https://travis-ci.org/billyvg/node-client)
WIP: Currently only works on node 8

## Installation
Install [node-host](https://github.com/billyvg/node-host) using your vim plugin manager. Then install the `neovim` package globally using `npm`.

```sh
npm install -g neovim
```
## Usage
This package exports a single `attach()` function which takes a pair of
write/read streams and invokes a callback with a Nvim API object. Currently, it provides a dynamically generated API based on your current version of neovim. In the future there will be an API similar to `python-client`

A [typescript declaration file](index.d.ts) is available as documentation of the
API and also for typescript users that seek to use this library. Note that the
interfaces are [automatically generated](generate-typescript-interfaces.js) at a
certain point in time, and may not correspond exactly to the API of your
installed Nvim.

### `attach`

```js
const cp = require('child_process');
const attach = require('neovim').attach;

const nvim_proc = cp.spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {});

// Attach to neovim process
const nvim = await attach(nvim_proc.stdin, nvim_proc.stdout);
await nvim.apiPromise;
nvim.command('vsp');
nvim.command('vsp');
nvim.command('vsp');
const windows = await nvim.listWins();

// expect(windows.length).toEqual(4);
// expect(windows[0] instanceof nvim.Window).toEqual(true);
// expect(windows[1] instanceof nvim.Window).toEqual(true);

await nvim.setCurrentWin(windows[2]);
const win = await nvim.getCurrentWin();

// expect(win).not.toEqual(windows[0]);
// expect(win).toEqual(windows[2]);

const buf = await nvim.getCurrentBuf();
// expect(buf instanceof nvim.Buffer).toEqual(true);

const lines = await buf.getLines(0, -1, true);
// expect(lines).toEqual(['']);

await buf.setLines(0, -1, true, ['line1', 'line2']);
const newLines = await buf.getLines(0, -1, true);
// expect(newLines).toEqual(['line1', 'line2']);

nvim.quit();
nvim_proc.kill();
```

## Writing a Plugin
A plugin can either be a file or folder in the `rplugin/node` directory. If the plugin is a folder, the `main` script from `package.json` will be loaded.

### API (Work In Progress)
If you are a plugin developer, I'd love to hear your feedback on the plugin API.

The `neovim` package exports a few decorators, which means currently there's a dependency on `babel`.
The plugin host creates an instance of the plugin and creates a mapping of the handling method.

`console` has been replaced by a `winston` interface and `console.log` will call `winston.info`.

```javascript
import { Plugin, Function, AutoCommand, Command } from 'neovim/plugin';

// If `Plugin` decorator can be called with options
@Plugin({ dev: true })
export default class JestPlugin {
  /** nvim is set via host so below is unnecessary **/
  
  /*
  constructor(nvim) {
    this.nvim = nvim;
  }
  */

  @Function('jestFunc', { sync: true })
  init(args, done) {
    console.log('jest load');
    this.nvim.command('vsplit');
  }

  @Command('jestCommand')
  longCommand(args) {
    // Do a long command
    console.log('jest_test2', args);
  }
}
```

## Debugging / troubleshooting
Here are a few env vars you can set while starting `neovim`, that can help debugging and configuring logging:

#### `NVIM_NODE_HOST_DEBUG`
Will spawn the node process that calls `neovim-client-host` with `--inspect-brk` so you can have a debugger. Pair that with this [Node Inspector Manager Chrome plugin](https://chrome.google.com/webstore/detail/nodejs-v8-inspector-manag/gnhhdgbaldcilmgcpfddgdbkhjohddkj?hl=en)

### Logging
Logging is done using `winston` through the `logger` module. Plugins have `console` replaced with this interface.

#### `NVIM_NODE_DEBUG_LEVEL`
Sets the logging level for winston. Default is `info`, available levels are `{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }`

#### `NVIM_NODE_LOG_FILE`
Sets the log file path

### Usage through node REPL
#### `NVIM_LISTEN_ADDRESS`
First, start Nvim with a known address (or use the $NVIM_LISTEN_ADDRESS of a running instance):

$ NVIM_LISTEN_ADDRESS=/tmp/nvim nvim
In another terminal, connect a node REPL to Nvim

```javascript
let nvim;
// `scripts/nvim` will detect if `NVIM_LISTEN_ADDRESS` is set and use that unix socket
// Otherwise will create an embedded `nvim` instance
require('neovim/scripts/nvim').then((n) => nvim = n);

nvim.command('vsp');
```

The tests and `scripts` can be consulted for more examples.
