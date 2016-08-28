module.exports = function promisifyNvim(nvim) {
  //promisify APIs
  var interfaces = {
    Nvim: nvim.constructor,
    Buffer: nvim.Buffer,
    Window: nvim.Window,
    Tabpage: nvim.Tabpage,
  };

  Object.keys(interfaces).forEach(function(key) {
    Object.keys(interfaces[key].prototype).forEach(function(method) {
      const oldMethod = interfaces[key].prototype[method];
      const metadata = oldMethod.metadata || { parameters: [] }
      if(metadata.parameters[metadata.parameters.length-1] !== 'cb') {
        return
      }
      interfaces[key].prototype[method] = function() {
        const args = Array.prototype.slice.call(arguments);
        const context = this;
        return new Promise(function(resolve, reject) {
          args.push(function(err, result) {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
          oldMethod.apply(context, args);
        });
      };
    })
  });
}
