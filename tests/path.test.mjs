import test from 'node:test'
import assert from 'node:assert/strict'
import { filePathOf, fileNameOf, suffixOf } from '../src/runtime/path.js'

test('decodes a session file address once per segment', () => {
  assert.equal(filePathOf('dsh-resource://file/session/s//w/a.md'), '/w/a.md')
  assert.equal(filePathOf('dsh-resource://file/session/s/a%23b%20c.txt'), 'a#b c.txt')
  assert.equal(filePathOf('dsh-resource://file/session/s/a%20b#frag?x=1'), 'a b')
})

test('decodes an absolute file address', () => {
  assert.equal(filePathOf('dsh-resource://file/absolute//x/y.txt'), '//x/y.txt')
  assert.equal(filePathOf('dsh-resource://file/absolute/C:/x/y.txt'), 'C:/x/y.txt')
})

test('rejects malformed or foreign addresses', () => {
  assert.equal(filePathOf('dsh-resource://file/session/s/%zz'), undefined)
  assert.equal(filePathOf('dsh-resource://image/session/s/a.png'), undefined)
  assert.equal(filePathOf('https://example.com/a.txt'), undefined)
})

test('derives a basename and suffix in either separator spelling', () => {
  assert.equal(fileNameOf('C:\\work\\A.MD'), 'A.MD')
  assert.equal(fileNameOf('/a/b/'), 'b')
  assert.equal(suffixOf('C:\\work\\A.MD'), 'md')
  assert.equal(suffixOf('/a.tar.gz'), 'gz')
  assert.equal(suffixOf('/README'), '')
})
