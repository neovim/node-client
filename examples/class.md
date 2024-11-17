#### Class style

```js
class MyPlugin {
  constructor(plugin) {
    this.plugin = plugin;

    plugin.registerCommand('SetMyLine', [this, this.setLine]);
  }

  setLine() {
    this.plugin.nvim.setLine('A line, for your troubles');
  }
}

module.exports = plugin => new MyPlugin(plugin);

// Or for convenience, exporting the class itself is equivalent to the above

module.exports = MyPlugin;
```
