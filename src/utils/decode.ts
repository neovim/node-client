import * as Session from 'msgpack5rpc';
import * as traverse from 'traverse';

export function decode(obj) {
  traverse(obj).forEach(function traverseItemFunc(item) {
    if (item instanceof Session) {
      this.update(item, true);
    } else if (Buffer.isBuffer(item)) {
      try {
        this.update(item.toString('utf8'));
      } catch (e) {}
    }
  });
  return obj;
}
