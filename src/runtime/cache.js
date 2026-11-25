/** Per-content result cache; the source bytes object is the only cache key. */

/**
 * Create a cache whose entries live exactly as long as the source bytes object.
 * @returns {{ get: (bytes: object, kind: string) => unknown, set: (bytes: object, kind: string, value: unknown) => void, clear: () => void }} the cache.
 */
export function createResultCache() {
  let root = new WeakMap()
  return {
    get(bytes, kind) {
      return root.get(bytes)?.get(kind)
    },
    set(bytes, kind, value) {
      let values = root.get(bytes)
      if (values === undefined) {
        values = new Map()
        root.set(bytes, values)
      }
      values.set(kind, value)
    },
    clear() {
      root = new WeakMap()
    },
  }
}
