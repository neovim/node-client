import * as traverse from 'traverse';
import Session = require('msgpack5rpc');

export function decode(obj: any) {
  traverse(obj).forEach(function traverseItemFunc(item) {
    if (item instanceof (<any>Session)) {
      this.update(item, true);
    } else if (Buffer.isBuffer(item)) {
      try {
        this.update(item.toString('utf8'));
      } catch (e) {}
    }
  });
  return obj;
}
