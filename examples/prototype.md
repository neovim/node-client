#### Prototype style

Prototype-based plugins are similar to class based plugins.

```js
function MyPlugin(plugin) {
  this.plugin = plugin;
  plugin.registerFunction('MyFunc', [this, MyPlugin.prototype.func]);
}

MyPlugin.prototype.func = function() {
  this.plugin.nvim.setLine('A line, for your troubles');
};

export default MyPlugin;

// or

export default (plugin) => new MyPlugin(plugin);
```

