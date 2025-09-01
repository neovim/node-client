/**
 * Clones an object (copies "own properties") until `depth`, where:
 * - depth=0 returns non-object value, or empty object (`{}` or `[]`).
 * - depth=1 returns `obj` with its immediate children (but not their children).
 * - depth=2 returns `obj` with its children and their children.
 * - and so on...
 *
 * TODO: node's `util.inspect()` function is better, but doesn't work in web browser?
 *
 * @param obj Object to clone.
 * @param depth
 * @param omitKeys Omit properties matching these names (at any depth).
 * @param replacement Replacement for object whose fields extend beyond `depth`, and properties matching `omitKeys`.
 */
export function partialClone(
  obj: any,
  depth: number = 3,
  omitKeys: string[] = [],
  replacement: any = undefined
): any {
  // Base case: If input is not an object or has no children, return it.
  if (typeof obj !== 'object' || obj === null || Object.getOwnPropertyNames(obj).length === 0) {
    return obj;
  }

  // Create a new object of the same type as the input object.
  const clonedObj = Array.isArray(obj) ? [] : {};

  if (depth === 0) {
    return replacement || clonedObj;
  }

  // Recursively clone properties of the input object
  for (const key of Object.keys(obj)) {
    if (omitKeys.includes(key)) {
      (clonedObj as any)[key] = replacement || (Array.isArray(obj) ? [] : {});
    } else if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (clonedObj as any)[key] = partialClone(obj[key], depth - 1, omitKeys, replacement);
    }
  }

  return clonedObj;
}

/**
 * Polyfill for Symbol.asyncDispose if not available in the runtime.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncDispose
 */
export const ASYNC_DISPOSE_SYMBOL = Symbol.asyncDispose ?? Symbol.for('Symbol.asyncDispose');
