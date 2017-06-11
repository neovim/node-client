const Session = require('msgpack5rpc');
const traverse = require('traverse');

function decode(obj) {
  traverse(obj).forEach(function traverseItemFunc(item) {
    if (item instanceof Session) {
      this.update(item, true);
    } else if (Buffer.isBuffer(item)) {
      try {
        this.update(item.toString('utf8'));
        // eslint-disable-next-line
      } catch (e) {}
    }
  });

  return obj;
}

module.exports = decode;
module.exports.default = module.exports;
