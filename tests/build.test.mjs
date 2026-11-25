import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../', import.meta.url).pathname
const read = name => readFileSync(join(root, name), 'utf8')

test('entry registers the package factory without a static chunk', () => {
  const entry = read('client.js')
  assert.match(entry, /__ModuleLoader__\.load\(/)
  assert.match(entry, /id:\s*"dsh-resource-url-compat"/)
  assert.doesNotMatch(entry, /require\.async\("\.\/client\./)
})

test('chunk registers owner id and chunk name', () => {
  for (const [file, exportName] of [['client.binary.js', 'BinaryBody'], ['client.media.js', 'MediaBody'], ['client.image.js', 'ImageBody'], ['client.font.js', 'FontBody'], ['client.archive.js', 'ArchiveBody']]) {
    const chunk = read(file)
    assert.match(chunk, /id:\s*"dsh-resource-url-compat"/)
    assert.match(chunk, new RegExp(`chunk:\\s*"${file.replaceAll('.', '\\.')}"`))
    assert.match(chunk, new RegExp(exportName))
  }
})

test('generated artifacts are world-readable', () => {
  for (const file of ['client.js', 'client.media.js', 'client.image.js', 'client.font.js', 'client.archive.js', 'client.binary.js']) {
    assert.equal(statSync(join(root, file)).mode & 0o777, 0o644, `${file} mode`)
  }
})

test('generated artifacts contain no raw control characters', () => {
  for (const file of ['client.js', 'client.media.js', 'client.image.js', 'client.font.js', 'client.archive.js', 'client.binary.js']) {
    const code = read(file)
    for (let index = 0; index < code.length; index += 1) {
      const char = code.charCodeAt(index)
      if (char < 32 && char !== 9 && char !== 10 && char !== 13) {
        assert.fail(`${file} contains raw control character U+${char.toString(16).padStart(4, '0')} at ${index}`)
      }
    }
  }
})
