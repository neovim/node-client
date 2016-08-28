module.exports = function promisifyNvim(nvim) {
  //promisify APIs
  var interfaces = {
    Nvim: nvim.constructor,
    Buffer: nvim.Buffer,
    Window: nvim.Window,
    Tabpage: nvim.Tabpage,
  };

  Object.keys(interfaces).forEach(function(key) {
    var name = key;
    Object.keys(interfaces[key].prototype).forEach(function(method) {
      const oldMethod = interfaces[key].prototype[method];
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
