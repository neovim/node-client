#### Decorator style

The `NvimPlugin` object is passed as a second parameter in case you wish to dynamically register further commands in the constructor.

```js
import { Plugin, Function, Autocmd, Command } from 'neovim';

// If `Plugin` decorator can be called with options
@Plugin({ dev: true })
export default class TestPlugin {

  constructor(nvim, plugin) {}

  @Function('Vsplit', { sync: true })
  splitMe(args, done) {
    this.nvim.command('vsplit');
  }

  @Command('LongCommand')
  async longCommand(args) {
    console.log('Output will be routed to $NVIM_NODE_LOG_FILE');
    const bufferName = await this.nvim.buffer.name;
    return bufferName;
  }

  @Command('UsePromises')
  promiseExample() {
    return this.nvim.buffer.name.then((name) => {
      console.log(`Current buffer name is ${name}`);
    });
  }
}
```


