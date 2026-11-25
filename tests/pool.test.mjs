import test from 'node:test'
import assert from 'node:assert/strict'
import { createPool } from '../src/runtime/pool.js'
import { poolBudget } from '../src/runtime/limits.js'

const codeOf = error => error && error.code

function fakeWorkers() {
  const created = []
  const createWorker = source => {
    const worker = {
      source,
      posts: [],
      terminated: false,
      postMessage(message, transfer) { this.posts.push({ message, transfer }) },
      terminate() { this.terminated = true },
    }
    created.push(worker)
    return worker
  }
  return { createWorker, created }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const settle = (promise) => promise.then(value => ({ ok: true, value }), error => ({ ok: false, error }))

test('poolBudget follows hardware and memory hints', () => {
  assert.deepEqual(poolBudget({ hardwareConcurrency: 8, deviceMemory: 8 }), { maxWorkers: 4, maxBytes: 64 * 1024 * 1024, maxQueue: 12 })
  assert.deepEqual(poolBudget({ hardwareConcurrency: 1, deviceMemory: 8 }), { maxWorkers: 1, maxBytes: 64 * 1024 * 1024, maxQueue: 12 })
  assert.deepEqual(poolBudget({ hardwareConcurrency: 8, deviceMemory: 2 }), { maxWorkers: 1, maxBytes: 32 * 1024 * 1024, maxQueue: 12 })
})

test('pool limits concurrency and copies bytes before transfer', async () => {
  const { createWorker, created } = fakeWorkers()
  const pool = createPool({ createWorker, maxWorkers: 2, maxBytes: 1024, maxQueue: 4 })
  const bytes = new Uint8Array([1, 2, 3])
  const first = settle(pool.run({ source: 's', payload: { kind: 'x', bytes }, timeoutMs: 100 }))
  const second = settle(pool.run({ source: 's', payload: { kind: 'x', bytes }, timeoutMs: 100 }))
  assert.equal(created.length, 2)
  assert.equal(created[0].posts[0].message.bytes.length, 3)
  assert.notEqual(created[0].posts[0].message.bytes, bytes)
  assert.equal(created[0].posts[0].transfer[0], created[0].posts[0].message.bytes.buffer)
  created[0].onmessage({ data: { v: 1, ok: true, value: 'a' } })
  assert.equal((await first).value, 'a')
  created[1].onmessage({ data: { v: 1, ok: true, value: 'b' } })
  assert.equal((await second).value, 'b')
  pool.dispose()
})

test('pool waits for the in-flight byte budget before starting another worker', async () => {
  const { createWorker, created } = fakeWorkers()
  const pool = createPool({ createWorker, maxWorkers: 2, maxBytes: 8, maxQueue: 4 })
  const six = new Uint8Array(6)
  const first = settle(pool.run({ source: 's', payload: { kind: 'x', bytes: six }, timeoutMs: 100 }))
  const second = settle(pool.run({ source: 's', payload: { kind: 'x', bytes: six }, timeoutMs: 100 }))
  assert.equal(created.length, 1)
  created[0].onmessage({ data: { v: 1, ok: true, value: 'first' } })
  assert.equal((await first).value, 'first')
  assert.equal(created.length, 2)
  created[1].onmessage({ data: { v: 1, ok: true, value: 'second' } })
  assert.equal((await second).value, 'second')
  pool.dispose()
})

test('pool rejects a full queue immediately with busy', async () => {
  const { createWorker } = fakeWorkers()
  const pool = createPool({ createWorker, maxWorkers: 1, maxBytes: 1024, maxQueue: 1 })
  const first = settle(pool.run({ source: 's', payload: {}, timeoutMs: 100 }))
  const second = settle(pool.run({ source: 's', payload: {}, timeoutMs: 100 }))
  const third = await settle(pool.run({ source: 's', payload: {}, timeoutMs: 100 }))
  assert.equal(codeOf(third.error), 'busy')
  pool.dispose()
  await first
  await second
})

test('pool terminates a timed-out worker and rejects with timeout', async () => {
  const { createWorker, created } = fakeWorkers()
  const pool = createPool({ createWorker, maxWorkers: 1, maxBytes: 1024, maxQueue: 1 })
  const result = await settle(pool.run({ source: 's', payload: {}, timeoutMs: 10 }))
  assert.equal(codeOf(result.error), 'timeout')
  assert.equal(created[0].terminated, true)
  pool.dispose()
})

test('pool cancels queued and running jobs through an AbortSignal', async () => {
  const { createWorker, created } = fakeWorkers()
  const pool = createPool({ createWorker, maxWorkers: 1, maxBytes: 1024, maxQueue: 1 })
  const queuedController = new AbortController()
  const runningController = new AbortController()
  const running = settle(pool.run({ source: 's', payload: {}, timeoutMs: 100, signal: runningController.signal }))
  const queued = settle(pool.run({ source: 's', payload: {}, timeoutMs: 100, signal: queuedController.signal }))
  queuedController.abort()
  assert.equal(codeOf((await queued).error), 'aborted')
  runningController.abort()
  assert.equal(codeOf((await running).error), 'aborted')
  assert.equal(created[0].terminated, true)
  pool.dispose()
})

test('pool validates worker output and rejects invalid messages', async () => {
  const { createWorker, created } = fakeWorkers()
  const pool = createPool({ createWorker, maxWorkers: 1, maxBytes: 1024, maxQueue: 1 })
  const result = settle(pool.run({
    source: 's', payload: {}, timeoutMs: 100,
    validate: value => {
      if (value !== 'good') throw new Error('invalid')
      return value
    },
  }))
  created[0].onmessage({ data: { v: 1, ok: true, value: 'bad' } })
  assert.equal(codeOf((await result).error), 'invalid')
  pool.dispose()
})

test('pool dispose rejects queued and running work and terminates workers', async () => {
  const { createWorker, created } = fakeWorkers()
  const pool = createPool({ createWorker, maxWorkers: 1, maxBytes: 1024, maxQueue: 2 })
  const first = settle(pool.run({ source: 's', payload: {}, timeoutMs: 100 }))
  const second = settle(pool.run({ source: 's', payload: {}, timeoutMs: 100 }))
  pool.dispose()
  assert.equal(codeOf((await first).error), 'disposed')
  assert.equal(codeOf((await second).error), 'disposed')
  assert.equal(created[0].terminated, true)
  await wait(1)
})
