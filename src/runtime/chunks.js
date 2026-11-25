/** Promise cache for package-local lazy chunks; a failed load is retried instead of cached. */

const CHUNK = /^client\.([A-Za-z0-9][A-Za-z0-9._-]*)\.js$/u

/**
 * Create a chunk loader over the Client factory's `require.async`.
 * @param {{ async: (specifier: string) => Promise<unknown> }} require - Client module loader require.
 * @returns {{ load: (fileName: string) => Promise<unknown>, clear: (fileName: string) => void, dispose: () => void }} the loader.
 */
export function createChunkLoader(require) {
  const pending = new Map()
  return {
    load(fileName) {
      if (!CHUNK.test(fileName)) return Promise.reject(new Error(`resource-preview: invalid chunk ${JSON.stringify(fileName)}`))
      const known = pending.get(fileName)
      if (known !== undefined) return known
      const load = Promise.resolve(require.async(`./${fileName}`)).catch((error) => {
        if (pending.get(fileName) === load) pending.delete(fileName)
        throw error
      })
      pending.set(fileName, load)
      return load
    },
    clear(fileName) {
      pending.delete(fileName)
    },
    dispose() {
      pending.clear()
    },
  }
}
