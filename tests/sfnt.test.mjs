import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSfnt } from '../src/workers/pure/sfnt.js'
import { LIMITS } from '../src/runtime/limits.js'

function utf16be(text) {
  const bytes = new Uint8Array(text.length * 2)
  for (let index = 0; index < text.length; index += 1) {
    bytes[index * 2] = text.charCodeAt(index) >> 8
    bytes[index * 2 + 1] = text.charCodeAt(index) & 0xff
  }
  return bytes
}

function ttf(family = 'Demo') {
  const familyBytes = utf16be(family)
  const name = new Uint8Array(18 + familyBytes.length)
  const view = new DataView(name.buffer)
  view.setUint16(0, 0)
  view.setUint16(2, 1)
  view.setUint16(4, 18)
  view.setUint16(6, 3)
  view.setUint16(8, 1)
  view.setUint16(10, 0x0409)
  view.setUint16(12, 1)
  view.setUint16(14, familyBytes.length)
  view.setUint16(16, 0)
  name.set(familyBytes, 18)
  const bytes = new Uint8Array(28 + name.length)
  const header = new DataView(bytes.buffer)
  header.setUint32(0, 0x00010000)
  header.setUint16(4, 1)
  const record = 12
  header.setUint32(record, 0x6e616d65)
  header.setUint32(record + 4, 0)
  header.setUint32(record + 8, 28)
  header.setUint32(record + 12, name.length)
  bytes.set(name, 28)
  return bytes
}

test('reads the family name from a minimal TrueType font', async () => {
  const parsed = await parseSfnt(ttf('Demo'), LIMITS)
  assert.equal(parsed.format, 'ttf')
  assert.equal(parsed.family, 'Demo')
  assert.deepEqual(parsed.tables, ['name'])
  assert.equal(parsed.truncated, false)
})

test('rejects a truncated table directory', async () => {
  const bytes = ttf()
  bytes[4] = 2
  await assert.rejects(parseSfnt(bytes, LIMITS), error => error.code === 'invalid')
})

test('rejects more tables than the limit', async () => {
  const bytes = ttf()
  new DataView(bytes.buffer).setUint16(4, LIMITS.maxFontTables + 1)
  await assert.rejects(parseSfnt(bytes, LIMITS), error => error.code === 'tooLarge')
})

test('reads WOFF2 table tags without decompressing glyph data', async () => {
  const bytes = new Uint8Array(49)
  const view = new DataView(bytes.buffer)
  bytes.set([0x77, 0x4f, 0x46, 0x32], 0)
  view.setUint32(4, 0x00010000)
  view.setUint32(8, 49)
  view.setUint16(12, 1)
  bytes[48] = 0x00
  // A one-byte origLength follows; the entry parser must consume it.
  const extended = new Uint8Array(50)
  extended.set(bytes)
  extended[49] = 0x01
  const parsed = await parseSfnt(extended, LIMITS)
  assert.equal(parsed.format, 'woff2')
  assert.deepEqual(parsed.tables, ['cmap'])
  assert.equal(parsed.family, undefined)
})
