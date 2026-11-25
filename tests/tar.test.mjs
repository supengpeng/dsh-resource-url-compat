import test from 'node:test'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { parseTar, parseGzip } from '../src/workers/pure/tar.js'
import { LIMITS } from '../src/runtime/limits.js'

const set = (target, offset, text) => { target.set(new TextEncoder().encode(text), offset) }

function header(name, size, type = '0', prefix = '') {
  const bytes = new Uint8Array(512)
  set(bytes, 0, name.slice(0, 100))
  set(bytes, 124, `${size.toString(8).padStart(11, '0')}\0`)
  set(bytes, 156, type)
  set(bytes, 257, 'ustar')
  set(bytes, 263, '00')
  set(bytes, 345, prefix.slice(0, 155))
  return bytes
}

function entry(name, data, type = '0', prefix = '') {
  const body = new TextEncoder().encode(data)
  const padded = Math.ceil(body.length / 512) * 512
  const bytes = new Uint8Array(512 + padded)
  bytes.set(header(name, body.length, type, prefix), 0)
  bytes.set(body, 512)
  return bytes
}

function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const bytes = new Uint8Array(total)
  let at = 0
  for (const part of parts) { bytes.set(part, at); at += part.length }
  return bytes
}

test('lists ustar entries with prefix and PAX long names', () => {
  const paxPayload = 'path=deep/long-name.txt\n'
  const pax = entry('PaxHeaders/1', `${paxPayload.length + 3} ${paxPayload}`, 'x')
  const long = entry('short', 'hello', '0')
  const bytes = concat([pax, long, entry('dir/', '', '5')])
  const parsed = parseTar(bytes, LIMITS)
  assert.equal(parsed.entries.length, 2)
  assert.equal(parsed.entries[0].path, 'deep/long-name.txt')
  assert.equal(parsed.entries[0].directory, false)
  assert.equal(parsed.entries[1].directory, true)
  const ustar = parseTar(concat([entry('file.txt', 'x', '0', 'prefix/')]), LIMITS)
  assert.equal(ustar.entries[0].path, 'prefix/file.txt')
})

test('reads the gzip footer size without decompressing', () => {
  const info = parseGzip(new Uint8Array(gzipSync(Buffer.from('hello gzip'))))
  assert.equal(info.size, 10)
})

test('rejects truncated and oversized tar listings', () => {
  const truncated = header('file.txt', 1000)
  assert.throws(() => parseTar(truncated, LIMITS), error => error.code === 'invalid')
  const many = concat(Array.from({ length: LIMITS.maxEntries + 1 }, (_, index) => entry(`f${index}` , '')))
  assert.throws(() => parseTar(many, LIMITS), error => error.code === 'tooLarge')
})
