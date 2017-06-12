const util = require('util');
const Duplex = require('stream').Duplex;

function DevNull() {
  Duplex.call(this);
}
util.inherits(DevNull, Duplex);

DevNull.prototype._read = function() {};
DevNull.prototype._write = function(chunk, enc, cb) {
  cb();
};

module.exports = DevNull;
