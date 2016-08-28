var attachWithCallback = require('./index');
var promisify = require('./promisify');

module.exports = function attach(writer, reader) {
  return new Promise(function(resolve, reject) {
    attachWithCallback(writer, reader, function(err, nvim) {
      if (err) {
        reject(err);
      } else {
        promisify(nvim);
        resolve(nvim);
      }
    });
  });
}

// 'default' export for ES2015 or TypeScript environment.
module.exports.default = module.exports;
