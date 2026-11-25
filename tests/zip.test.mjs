import test from 'node:test'
import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { parseZip, readZipEntry } from '../src/workers/pure/zip.js'
import { LIMITS } from '../src/runtime/limits.js'

const u16 = (view, at, value) => view.setUint16(at, value, true)
const u32 = (view, at, value) => view.setUint32(at, value, true)
const ascii = text => new TextEncoder().encode(text)

export function makeZip(entries) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const entry of entries) {
    const name = ascii(entry.name)
    const data = entry.data ?? new Uint8Array([0])
    const method = entry.method ?? 8
    const compressed = method === 8 ? deflateRawSync(data) : data
    const compressedBytes = new Uint8Array(compressed)
    const local = new Uint8Array(30 + name.length + compressedBytes.length)
    const lv = new DataView(local.buffer)
    u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, entry.flags ?? 0); u16(lv, 8, method)
    u32(lv, 14, 0); u32(lv, 18, entry.compressedOverride ?? compressedBytes.length); u32(lv, 22, entry.uncompressedOverride ?? data.length)
    u16(lv, 26, name.length); u16(lv, 28, 0)
    local.set(name, 30); local.set(compressedBytes, 30 + name.length)
    locals.push(local)
    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, entry.flags ?? 0); u16(cv, 10, method)
    u32(cv, 16, 0); u32(cv, 20, entry.compressedOverride ?? compressedBytes.length); u32(cv, 24, entry.uncompressedOverride ?? data.length)
    u16(cv, 28, name.length); u16(cv, 30, 0); u16(cv, 32, 0); u16(cv, 34, 0); u16(cv, 36, 0)
    u32(cv, 42, offset)
    central.set(name, 46)
    centrals.push(central)
    offset += local.length
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  u32(ev, 0, 0x06054b50); u16(ev, 8, entries.length); u16(ev, 10, entries.length)
  u32(ev, 12, centralSize); u32(ev, 16, offset)
  const all = new Uint8Array(offset + centralSize + end.length)
  let at = 0
  for (const local of locals) { all.set(local, at); at += local.length }
  for (const central of centrals) { all.set(central, at); at += central.length }
  all.set(end, at)
  return all
}

test('lists ZIP entries with safety, encryption, and method state', () => {
  const bytes = makeZip([
    { name: 'hello.txt', data: new TextEncoder().encode('hello'), method: 8 },
    { name: '../evil.txt', data: new Uint8Array([1]), method: 0 },
    { name: 'encrypted.bin', data: new Uint8Array([2]), flags: 1 },
    { name: 'odd.bin', data: new Uint8Array([3]), method: 99 },
    { name: 'bomb.bin', data: new Uint8Array([4]), uncompressedOverride: 64 * 1024 * 1024 },
  ])
  const parsed = parseZip(bytes, LIMITS)
  assert.equal(parsed.entries.length, 5)
  assert.equal(parsed.entries[0].path, 'hello.txt')
  assert.equal(parsed.entries[0].method, 8)
  assert.equal(parsed.entries[1].unsafe, true)
  assert.equal(parsed.entries[2].encrypted, true)
  assert.equal(parsed.entries[3].method, 99)
  assert.equal(parsed.entries[4].bomb, true)
})

test('reads a text entry and rejects unsafe or unsupported entries', async () => {
  const bytes = makeZip([
    { name: 'hello.txt', data: new TextEncoder().encode('hello'), method: 8 },
    { name: 'image.png', data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), method: 0 },
    { name: '../evil.txt', data: new TextEncoder().encode('evil'), method: 0 },
  ])
  const text = await readZipEntry(bytes, 0, LIMITS)
  assert.equal(text.kind, 'text')
  assert.equal(text.text, 'hello')
  const image = await readZipEntry(bytes, 1, LIMITS)
  assert.equal(image.kind, 'image')
  assert.equal(image.mediaType, 'image/png')
  const unsafe = await readZipEntry(bytes, 2, LIMITS)
  assert.equal(unsafe.kind, 'unsupported')
})

test('rejects a truncated archive and an oversized declared entry', async () => {
  assert.throws(() => parseZip(new Uint8Array(22), LIMITS), error => error.code === 'invalid')
  const bytes = makeZip([{ name: 'big.bin', data: new Uint8Array([1]), uncompressedOverride: LIMITS.maxEntryBytes + 1 }])
  await assert.rejects(readZipEntry(bytes, 0, LIMITS), error => error.code === 'tooLarge')
})
