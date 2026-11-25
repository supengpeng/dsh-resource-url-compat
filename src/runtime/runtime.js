/** Per-activation runtime: disposable workers, lazy chunks, result cache, and fixed limits. */
import { createResultCache } from './cache.js'
import { createChunkLoader } from './chunks.js'
import { LIMITS, poolBudget } from './limits.js'
import { createPool } from './pool.js'

/**
 * Create the runtime for one plugin activation.
 * @param {{ async: (specifier: string) => Promise<unknown> }} require - Client module loader require.
 * @returns {{ pool: object, chunks: object, cache: object, limits: object, workerAvailable: boolean, dispose: () => void }} the runtime.
 */
export function createRuntime(require) {
  const budget = poolBudget(typeof navigator === 'object' && navigator !== null ? navigator : undefined)
  const workerAvailable = typeof Worker === 'function' && typeof Blob === 'function'
    && typeof URL?.createObjectURL === 'function'
  const chunks = createChunkLoader(require ?? { async: () => Promise.reject(new Error('resource-preview: module loader unavailable')) })
  const cache = createResultCache()
  const pool = createPool({
    createWorker(source) {
      if (!workerAvailable) throw new Error('resource-preview: Worker is unavailable')
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
      try {
        return new Worker(url, { name: 'dsh-resource-preview' })
      } finally {
        URL.revokeObjectURL(url)
      }
    },
    maxWorkers: budget.maxWorkers,
    maxBytes: budget.maxBytes,
    maxQueue: budget.maxQueue,
  })
  let disposed = false
  return {
    pool,
    chunks,
    cache,
    limits: LIMITS,
    workerAvailable,
    dispose() {
      if (disposed) return
      disposed = true
      pool.dispose()
      chunks.dispose()
      cache.clear()
    },
  }
}
