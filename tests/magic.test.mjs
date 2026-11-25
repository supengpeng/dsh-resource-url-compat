import test from 'node:test'
import assert from 'node:assert/strict'
import { scanBinary } from '../src/workers/pure/magic.js'
import { hexPage } from '../src/workers/pure/hex.js'
import { LIMITS } from '../src/runtime/limits.js'

const bytesOf = (...values) => new Uint8Array(values)
const ascii = text => [...text].map(char => char.charCodeAt(0))

test('recognizes executable, module, database, and container magic', () => {
  assert.equal(scanBinary(bytesOf(0x7f, 0x45, 0x4c, 0x46, 2, 1, 0), LIMITS).format, 'elf')
  assert.equal(scanBinary(bytesOf(0x4d, 0x5a, 0, 0), LIMITS).format, 'pe')
  assert.equal(scanBinary(bytesOf(0x00, 0x61, 0x73, 0x6d, 1, 0, 0, 0), LIMITS).format, 'wasm')
  assert.equal(scanBinary(new Uint8Array([...ascii('SQLite format 3'), 0]), LIMITS).format, 'sqlite')
  assert.equal(scanBinary(new Uint8Array([...ascii('8BPS'), 0, 1]), LIMITS).format, 'psd')
  assert.equal(scanBinary(bytesOf(0x50, 0x4b, 3, 4), LIMITS).format, 'zip')
  assert.equal(scanBinary(bytesOf(0x1f, 0x8b, 8), LIMITS).format, 'gzip')
  assert.equal(scanBinary(bytesOf(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c), LIMITS).format, '7z')
  assert.equal(scanBinary(new Uint8Array([...ascii('Rar!'), 0]), LIMITS).format, 'rar')
  assert.equal(scanBinary(new Uint8Array([0, 0, 0, 0]), LIMITS).format, 'unknown')
})

test('reads SQLite header fields in big-endian order', () => {
  const bytes = new Uint8Array(60)
  bytes.set([...ascii('SQLite format 3')], 0)
  const view = new DataView(bytes.buffer)
  view.setUint16(16, 4096, false)
  view.setUint32(28, 10, false)
  view.setUint32(56, 1, false)
  const result = scanBinary(bytes, LIMITS)
  assert.equal(result.format, 'sqlite')
  assert.deepEqual(result.summary, ['pageSize=4096', 'pages=10', 'encoding=1'])
})

test('collects bounded printable strings', () => {
  const bytes = new Uint8Array([...ascii('hello world'), 0, 0xff, 0, ...ascii('second')])
  const result = scanBinary(bytes, LIMITS)
  assert.equal(result.strings.length, 2)
  assert.deepEqual(result.strings, ['hello world', 'second'])
})

test('formats a bounded hex page with offsets and ASCII', () => {
  const bytes = new Uint8Array([0x41, 0x42, 0x00, 0xff, ...new Array(12).fill(0x43)])
  const page = hexPage(bytes, 0, 16)
  assert.equal(page.rows.length, 1)
  assert.equal(page.rows[0].offset, 0)
  assert.equal(page.rows[0].hex.startsWith('41 42 00 FF'), true)
  assert.equal(page.rows[0].ascii, 'AB..' + 'C'.repeat(12))
  const empty = hexPage(bytes, 16, 16)
  assert.equal(empty.rows.length, 0)
})
