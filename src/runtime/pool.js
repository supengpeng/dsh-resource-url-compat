/** Bounded, cancellable scheduler for one-disposable-worker parsing tasks. */

const MiB = 1024 * 1024

/**
 * Create a coded failure.
 * @param {string} code - stable failure code.
 * @returns {Error & { code: string }} the failure.
 */
function poolError(code) {
  const error = new Error(`resource-preview: ${code}`)
  error.code = code
  return error
}

/**
 * Build a scheduler that owns at most one in-flight task per worker.
 * @param {object} options - scheduler dependencies and limits.
 * @param {(source: string) => Worker} options.createWorker - creates a disposable worker from source text.
 * @param {number} [options.maxWorkers] - concurrent task cap.
 * @param {number} [options.maxBytes] - in-flight payload byte cap.
 * @param {number} [options.maxQueue] - queued task cap.
 * @param {typeof setTimeout} [options.setTimeout] - timer dependency.
 * @param {typeof clearTimeout} [options.clearTimeout] - timer dependency.
 * @returns {{ run: (job: object) => Promise<unknown>, dispose: () => void, stats: () => object }} the pool.
 */
export function createPool({
  createWorker,
  maxWorkers = 4,
  maxBytes = 64 * MiB,
  maxQueue = 12,
  setTimeout: setTimer = globalThis.setTimeout,
  clearTimeout: clearTimer = globalThis.clearTimeout,
} = {}) {
  if (typeof createWorker !== 'function') throw new TypeError('resource-preview: createWorker is required')
  const queue = []
  const running = new Set()
  let active = 0
  let activeBytes = 0
  let disposed = false

  const settleQueued = (entry, error) => {
    if (entry.state !== 'queued') return
    entry.state = 'settled'
    if (entry.abort !== null) entry.signal.removeEventListener('abort', entry.abort)
    entry.abort = null
    entry.reject(error)
  }

  const pump = () => {
    if (disposed || active >= maxWorkers) return
    const next = queue[0]
    if (next === undefined) return
    if (active > 0 && activeBytes + next.weight > maxBytes) return
    queue.shift()
    start(next)
    if (active < maxWorkers) pump()
  }

  const finish = (entry, error, value) => {
    if (entry.state === 'settled') return
    entry.state = 'settled'
    if (entry.timer !== null) clearTimer(entry.timer)
    entry.timer = null
    if (entry.abort !== null) entry.signal.removeEventListener('abort', entry.abort)
    entry.abort = null
    const worker = entry.worker
    if (worker !== null) {
      worker.onmessage = null
      worker.onerror = null
      worker.onmessageerror = null
      try { worker.terminate() } catch { /* a terminated fake/test worker may throw; teardown continues. */ }
      entry.worker = null
    }
    running.delete(entry)
    active -= 1
    activeBytes -= entry.weight
    if (error !== undefined) entry.reject(error)
    else entry.resolve(value)
    pump()
  }

  const onMessage = entry => event => {
    const message = event?.data
    if (typeof message !== 'object' || message === null || message.v !== 1 || typeof message.ok !== 'boolean') {
      finish(entry, poolError('invalid'))
      return
    }
    if (message.ok === false) {
      finish(entry, poolError(typeof message.code === 'string' ? message.code : 'invalid'))
      return
    }
    let value = message.value
    if (entry.job.validate !== undefined) {
      try { value = entry.job.validate(value) } catch { finish(entry, poolError('invalid')); return }
    }
    finish(entry, undefined, value)
  }

  const start = entry => {
    entry.state = 'running'
    active += 1
    activeBytes += entry.weight
    let worker
    try {
      worker = createWorker(entry.job.source)
    } catch {
      finish(entry, poolError('invalid'))
      return
    }
    running.add(entry)
    entry.worker = worker
    worker.onmessage = onMessage(entry)
    worker.onerror = () => { finish(entry, poolError('invalid')) }
    worker.onmessageerror = () => { finish(entry, poolError('invalid')) }
    if (entry.signal?.aborted === true) { finish(entry, poolError('aborted')); return }
    entry.timer = setTimer(() => { finish(entry, poolError('timeout')) }, entry.timeoutMs)
    try {
      const payload = { ...entry.job.payload }
      const transfer = [...(entry.job.transfer ?? [])]
      if (payload.bytes instanceof Uint8Array) {
        payload.bytes = payload.bytes.slice()
        transfer.unshift(payload.bytes.buffer)
      }
      worker.postMessage({ v: 1, ...payload }, transfer)
    } catch {
      finish(entry, poolError('invalid'))
    }
  }

  const run = job => new Promise((resolve, reject) => {
    if (disposed) { reject(poolError('disposed')); return }
    if (typeof job !== 'object' || job === null || typeof job.source !== 'string'
      || typeof job.payload !== 'object' || job.payload === null) {
      reject(poolError('invalid'))
      return
    }
    const bytes = job.payload.bytes
    const weight = bytes instanceof Uint8Array ? bytes.byteLength : 0
    const timeoutMs = Number.isFinite(job.timeoutMs) && job.timeoutMs > 0 ? job.timeoutMs : 8000
    if (job.signal?.aborted === true) { reject(poolError('aborted')); return }
    const entry = {
      job, weight, timeoutMs, resolve, reject, state: 'queued', worker: null, timer: null,
      signal: job.signal, abort: null,
    }
    if (job.signal !== undefined) {
      entry.abort = () => {
        if (entry.state === 'queued') {
          const index = queue.indexOf(entry)
          if (index >= 0) queue.splice(index, 1)
          entry.state = 'settled'
          job.signal.removeEventListener('abort', entry.abort)
          reject(poolError('aborted'))
          return
        }
        if (entry.state === 'running') finish(entry, poolError('aborted'))
      }
      job.signal.addEventListener('abort', entry.abort, { once: true })
      if (job.signal.aborted) { entry.abort(); return }
    }
    if (active < maxWorkers && (active === 0 || activeBytes + weight <= maxBytes) && queue.length === 0) {
      start(entry)
      return
    }
    if (queue.length >= maxQueue) { reject(poolError('busy')); return }
    queue.push(entry)
    pump()
  })

  const dispose = () => {
    if (disposed) return
    disposed = true
    for (const entry of queue.splice(0)) settleQueued(entry, poolError('disposed'))
    // Active workers are settled through finish so their timers, listeners, and workers go away.
    for (const entry of [...running]) finish(entry, poolError('disposed'))
  }

  return {
    run,
    dispose,
    stats: () => ({ active, activeBytes, queued: queue.length }),
  }
}
