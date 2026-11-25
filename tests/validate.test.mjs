import test from 'node:test'
import assert from 'node:assert/strict'
import { validateWorkerResult } from '../src/runtime/validate.js'

const entry = extra => ({
  path: 'a.txt', bytes: 2, compressedBytes: 2, method: 0, encrypted: false,
  unsafe: false, bomb: false, ratio: 1, directory: false, ...extra,
})

test('accepts bounded archive listings and entries', () => {
  const value = { entries: [entry()], truncated: false }
  assert.deepEqual(validateWorkerResult('archive-list', value), value)
  const text = { kind: 'text', text: 'hello', truncated: false }
  assert.deepEqual(validateWorkerResult('archive-entry', text), text)
  const image = { kind: 'image', bytes: new Uint8Array([1]), mediaType: 'image/png' }
  assert.deepEqual(validateWorkerResult('archive-entry', image), image)
})

test('rejects malformed archive values', () => {
  assert.throws(() => validateWorkerResult('archive-list', {}), /invalid/)
  assert.throws(() => validateWorkerResult('archive-list', { entries: Array.from({ length: 4097 }, () => entry()), truncated: false }), /invalid/)
  assert.throws(() => validateWorkerResult('archive-list', { entries: [entry({ bytes: -1 })], truncated: false }), /invalid/)
  assert.throws(() => validateWorkerResult('archive-list', { entries: [entry({ method: 300 })], truncated: false }), /invalid/)
  assert.throws(() => validateWorkerResult('archive-entry', { kind: 'image', bytes: 'x', mediaType: 'image/png' }), /invalid/)
})

test('accepts bounded font and binary results', () => {
  const font = { format: 'ttf', tables: ['name'], truncated: false, family: 'Demo', unitsPerEm: 1000 }
  assert.deepEqual(validateWorkerResult('font-meta', font), font)
  const binary = { format: 'elf', summary: ['ELF 64'], strings: ['hello'], truncated: false }
  assert.deepEqual(validateWorkerResult('binary-scan', binary), binary)
  const signed = { format: 'ttf', tables: ['name'], truncated: false, ascender: 1901, descender: -483 }
  assert.deepEqual(validateWorkerResult('font-meta', signed), signed)
})

test('rejects unknown formats and oversized string sets', () => {
  assert.throws(() => validateWorkerResult('font-meta', { format: 'otf2', tables: [], truncated: false }), /invalid/)
  assert.throws(() => validateWorkerResult('binary-scan', { format: 'elf', summary: [], strings: Array.from({ length: 257 }, () => 'x'), truncated: false }), /invalid/)
  assert.throws(() => validateWorkerResult('binary-scan', { format: 'elf', summary: [], strings: ['x'.repeat(129)], truncated: false }), /invalid/)
})
