import { BaseApi } from '../Base';

const baseProperties = Object.getOwnPropertyNames(BaseApi.prototype);

export function createChainableApi(
  name: string,
  Type: any,
  requestPromise: () => Promise<any>,
  chainCallPromise?: () => Promise<any>
) {
  // @ts-expect-error don't know how to fix this or why this module was designed like this.
  const that = this as any;

  // re-use current promise if not resolved yet
  if (that[`${name}Promise`] && that[`${name}Promise`].status === 0 && that[`${name}Proxy`]) {
    return that[`${name}Proxy`];
  }

  that[`${name}Promise`] = requestPromise();

  // TODO: Optimize this
  // Define properties on the promise for devtools
  [...baseProperties, ...Object.getOwnPropertyNames(Type.prototype)].forEach(key => {
    Object.defineProperty(that[`${name}Promise`], key, {
      enumerable: true,
      writable: true,
      configurable: true,
    });
  });

  const proxyHandler = {
    get: (target: any, prop: string) => {
      // XXX which takes priority?
      // Check if property is property of an API object (Window, Buffer, Tabpage, etc)
      // If it is, then we return a promise of results of the call on that API object
      // i.e. await this.buffer.name will return a promise of buffer name

      const isOnPrototype =
        Object.prototype.hasOwnProperty.call(Type.prototype, prop) ||
        Object.prototype.hasOwnProperty.call(BaseApi.prototype, prop);

      // Inspect the property descriptor to see if it is a getter or setter
      // Otherwise when we check if property is a method, it will call the getter
      const descriptor =
        Object.getOwnPropertyDescriptor(Type.prototype, prop) ||
        Object.getOwnPropertyDescriptor(BaseApi.prototype, prop);
      const isGetter =
        descriptor &&
        (typeof descriptor.get !== 'undefined' || typeof descriptor.set !== 'undefined');

      // XXX: the promise can potentially be stale
      // Check if resolved, else do a refresh request for current buffer?
      if (Type && isOnPrototype) {
        if (
          isOnPrototype &&
          !isGetter &&
          ((prop in Type.prototype && typeof Type.prototype[prop] === 'function') ||
            (prop in BaseApi.prototype && typeof (BaseApi.prototype as any)[prop] === 'function'))
        ) {
          // If property is a method on Type, we need to invoke it with captured args
          return (...args: any[]) =>
            that[`${name}Promise`].then((res: any) => res[prop].call(res, ...args));
        }

        // Otherwise return the property requested after promise is resolved
        return (
          (chainCallPromise && chainCallPromise()) ||
          that[`${name}Promise`].then((res: any) => res[prop])
        );
      }

      if (prop in target) {
        // Forward rest of requests to Promise
        if (typeof target[prop] === 'function') {
          return target[prop].bind(target);
        }
        return target[prop];
      }

      return null;
    },

    set: (target: any, prop: string, value: any, receiver: Promise<any>) => {
      if (receiver && (receiver instanceof Promise || 'then' in receiver)) {
        receiver.then(obj => {
          if (prop in obj) {
            // eslint-disable-next-line no-param-reassign
            obj[prop] = value;
          }
        });
      } else {
        // eslint-disable-next-line no-param-reassign
        target[prop] = value;
      }

      // Maintain default assignment behavior
      return true;
    },
  };

  // Proxy the promise so that we can check for chained API calls
  that[`${name}Proxy`] = new Proxy(that[`${name}Promise`], proxyHandler);

  return that[`${name}Proxy`];
}
