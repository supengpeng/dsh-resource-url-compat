import test from 'node:test'
import assert from 'node:assert/strict'
import { createChunkLoader } from '../src/runtime/chunks.js'
import { FAMILY_DEFINITIONS, definitionOf } from '../src/runtime/formats.js'
import { registerPreviews } from '../src/runtime/registration.js'

test('chunk loader retries after a rejected load and caches success', async () => {
  let calls = 0
  const require = {
    async: () => {
      calls += 1
      return calls === 1 ? Promise.reject(new Error('first load failed')) : Promise.resolve({ Body: 'ok' })
    },
  }
  const loader = createChunkLoader(require)
  await assert.rejects(loader.load('client.media.js'), /first load failed/)
  assert.deepEqual(await loader.load('client.media.js'), { Body: 'ok' })
  assert.deepEqual(await loader.load('client.media.js'), { Body: 'ok' })
  assert.equal(calls, 2)
  await assert.rejects(loader.load('../escape.js'), /invalid chunk/)
})

test('registerPreviews wires one definition and one keyed body per family', () => {
  const definitions = []
  const bodies = []
  const t = key => `T:${key}`
  const scope = {
    documentPreviews: { register: definition => { definitions.push(definition); return () => {} } },
    slots: {
      inject(name, register) {
        assert.equal(name, 'sidebar.right.tab.document')
        return register()
      },
      register(options, component) { bodies.push({ options, component }); return () => {} },
    },
    effect(fn) { const dispose = fn(); return () => dispose?.() },
  }
  const bodyFor = family => ({ id: family.id })

  registerPreviews(scope, bodyFor, t)

  assert.equal(definitions.length, FAMILY_DEFINITIONS.length)
  assert.equal(bodies.length, FAMILY_DEFINITIONS.length)
  for (const [index, family] of FAMILY_DEFINITIONS.entries()) {
    const definition = definitions[index]
    const expected = definitionOf(family, t)
    assert.equal(definition.id, expected.id)
    assert.deepEqual(definition.extensions, expected.extensions)
    assert.deepEqual(definition.binaryExtensions, expected.binaryExtensions)
    assert.equal(definition.priority, 'extension')
    assert.equal(definition.loading, 'bytes-complete')
    assert.equal(definition.title(), `T:${family.titleKey}`)
    assert.equal(bodies[index].options.key, family.id)
    assert.equal(bodies[index].options.locale, 'resourcePreview')
    assert.equal(bodies[index].component.id, family.id)
  }
})
