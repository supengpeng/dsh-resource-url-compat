import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyUrlCompat,
  needsHostnamePatch,
  opaqueAuthority,
  patchedDescriptor,
} from '../src/url-compat.js'

test('reads the authority from the pathname left by an older parser', () => {
  assert.equal(opaqueAuthority({ pathname: '//file/session/a.md' }), 'file')
  assert.equal(opaqueAuthority({ pathname: '//media/session/a.png' }), 'media')
  assert.equal(opaqueAuthority({ pathname: '/session/a.md' }), '')
  assert.equal(opaqueAuthority({ pathname: '//' }), '')
})

test('patched getter changes only empty-host resource URLs', () => {
  const native = function nativeHost() { return '' }
  const descriptor = { configurable: true, enumerable: true, get: native }
  const patched = patchedDescriptor(descriptor, native)
  const resource = { protocol: 'dsh-resource:', pathname: '//file/probe.txt' }
  const other = { protocol: 'https:', pathname: '//file/probe.txt' }
  assert.equal(patched.get.call(resource), 'file')
  assert.equal(patched.get.call(other), '')
  assert.equal(patched.configurable, true)
  assert.equal(patched.enumerable, true)
})

test('installs both getters and restores the original descriptors', () => {
  const RealURL = globalThis.URL
  class FakeURL {
    constructor() {
      this.protocol = 'dsh-resource:'
      this.pathname = '//file/probe.txt'
    }
  }
  const nativeHostname = function fakeHostname() { return '' }
  const nativeHost = function fakeHost() { return '' }
  Object.defineProperty(FakeURL.prototype, 'hostname', { configurable: true, enumerable: true, get: nativeHostname })
  Object.defineProperty(FakeURL.prototype, 'host', { configurable: true, enumerable: true, get: nativeHost })
  let cleanup
  const ctx = {
    effect(fn, label) {
      assert.equal(label, 'dsh-resource-url-compat: URL host getters')
      cleanup = fn()
    },
    logger: { info() {} },
  }
  globalThis.URL = FakeURL
  try {
    assert.equal(needsHostnamePatch(), true)
    applyUrlCompat(ctx)
    assert.equal(new FakeURL().hostname, 'file')
    assert.equal(new FakeURL().host, 'file')
    assert.notEqual(Object.getOwnPropertyDescriptor(FakeURL.prototype, 'hostname').get, nativeHostname)
    assert.notEqual(Object.getOwnPropertyDescriptor(FakeURL.prototype, 'host').get, nativeHost)
    cleanup()
    assert.equal(new FakeURL().hostname, '')
    assert.equal(new FakeURL().host, '')
    assert.equal(Object.getOwnPropertyDescriptor(FakeURL.prototype, 'hostname').get, nativeHostname)
    assert.equal(Object.getOwnPropertyDescriptor(FakeURL.prototype, 'host').get, nativeHost)
  } finally {
    globalThis.URL = RealURL
  }
})
