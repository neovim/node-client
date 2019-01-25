#### Functional style

Functional style plugins provide the simplest interface for interacting with neovim.

```js
function onBufWrite() {
  console.log('Buffer written!');
}

module.exports = (plugin) => {
  plugin.registerAutocmd('BufWritePre', onBufWrite, { pattern: '*' });
};
```

