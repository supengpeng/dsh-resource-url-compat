import test from 'node:test'
import assert from 'node:assert/strict'
import { createResultCache } from '../src/runtime/cache.js'

test('cache hits only for the same content object and kind', () => {
  const cache = createResultCache()
  const bytes = new Uint8Array([1, 2])
  cache.set(bytes, 'archive-list', { entries: [] })
  assert.deepEqual(cache.get(bytes, 'archive-list'), { entries: [] })
  assert.equal(cache.get(bytes, 'font-meta'), undefined)
  assert.equal(cache.get(new Uint8Array([1, 2]), 'archive-list'), undefined)
})

test('clear drops every cached result', () => {
  const cache = createResultCache()
  const bytes = new Uint8Array([1])
  cache.set(bytes, 'binary-scan', { format: 'unknown' })
  cache.clear()
  assert.equal(cache.get(bytes, 'binary-scan'), undefined)
})
