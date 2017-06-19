import { inherits } from 'util';
import { Duplex } from 'stream';

export function DevNull() {
  Duplex.call(this);
}
inherits(DevNull, Duplex);

DevNull.prototype._read = function () { };
DevNull.prototype._write = function (chunk, enc, cb) {
  cb();
};

