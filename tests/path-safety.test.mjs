import test from 'node:test'
import assert from 'node:assert/strict'
import { safeArchivePath } from '../src/workers/pure/path-safety.js'
import { LIMITS } from '../src/runtime/limits.js'

test('marks absolute and traversal paths unsafe and normalizes separators', () => {
  assert.equal(safeArchivePath('../../etc/passwd', LIMITS).unsafe, true)
  assert.equal(safeArchivePath('/absolute/file', LIMITS).unsafe, true)
  assert.equal(safeArchivePath('C:\\Windows\\x', LIMITS).unsafe, true)
  assert.equal(safeArchivePath('docs/readme.txt', LIMITS).unsafe, false)
  assert.equal(safeArchivePath('docs\\readme.txt', LIMITS).display, 'docs/readme.txt')
})

test('removes control and bidi characters before display', () => {
  const value = safeArchivePath('a\u0000b\u202ec.txt', LIMITS)
  assert.equal(value.display, 'abc.txt')
  assert.equal(value.display.includes('\u202e'), false)
  assert.equal(value.unsafe, true)
})

test('bounds the displayed path length', () => {
  const value = safeArchivePath(`${'a'.repeat(LIMITS.maxPathChars + 10)}.txt`, LIMITS)
  assert.equal(value.display.length <= LIMITS.maxPathChars, true)
  assert.equal(value.unsafe, false)
})
