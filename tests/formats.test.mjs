import test from 'node:test'
import assert from 'node:assert/strict'
import { FAMILY_DEFINITIONS, definitionOf } from '../src/runtime/formats.js'

const DEDICATED = FAMILY_DEFINITIONS.filter(family => family.id.endsWith('/binary') === false)
const binary = FAMILY_DEFINITIONS.find(family => family.id.endsWith('/binary'))

test('defines one media, image, font, archive, and binary family', () => {
  assert.equal(FAMILY_DEFINITIONS.length, 5)
  for (const family of FAMILY_DEFINITIONS) {
    assert.equal(typeof family.id, 'string')
    assert.equal(typeof family.chunk, 'string')
    assert.equal(family.chunk.startsWith('client.'), true)
    assert.equal(family.id.endsWith('/binary') || /^dsh-resource-url-compat\/(media|image|font|archive)$/.test(family.id), true)
  }
  const ids = new Set(FAMILY_DEFINITIONS.map(family => family.id))
  assert.equal(ids.size, FAMILY_DEFINITIONS.length)
})

test('declares normalized suffixes and keeps binary suffixes within extensions', () => {
  for (const family of FAMILY_DEFINITIONS) {
    assert.ok(family.extensions.length > 0)
    for (const extension of family.extensions) {
      assert.equal(extension, extension.toLowerCase())
      assert.equal(extension.startsWith('.'), false)
    }
    for (const extension of family.binaryExtensions) {
      assert.equal(family.extensions.includes(extension), true, `${family.id} binary suffix ${extension}`)
    }
    assert.deepEqual([...family.binaryExtensions].sort(), [...family.extensions].sort())
  }
})

test('the binary family covers every dedicated suffix as a fallback', () => {
  for (const family of DEDICATED) {
    for (const extension of family.extensions) {
      assert.equal(binary.extensions.includes(extension), true, `${family.id} suffix ${extension}`)
    }
  }
  for (const extension of ['mp4', 'ttf', 'zip', 'wasm', 'sqlite']) {
    assert.equal(binary.extensions.includes(extension), true, extension)
  }
})

test('never claims a suffix the built-in preview already renders', () => {
  const builtIn = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'tsv']
  for (const family of FAMILY_DEFINITIONS) {
    for (const extension of family.extensions) {
      assert.equal(builtIn.includes(extension), false, `${family.id} claims ${extension}`)
    }
  }
})

test('definitionOf builds a document preview registration with an extension band', () => {
  const t = key => `T:${key}`
  const family = FAMILY_DEFINITIONS[0]
  const definition = definitionOf(family, t)
  assert.equal(definition.id, family.id)
  assert.equal(definition.loading, 'bytes-complete')
  assert.equal(definition.priority, 'extension')
  assert.equal(definition.title(), `T:${family.titleKey}`)
  assert.deepEqual(definition.extensions, family.extensions)
  assert.deepEqual(definition.binaryExtensions, family.binaryExtensions)
})
