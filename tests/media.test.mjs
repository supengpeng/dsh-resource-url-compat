import test from 'node:test'
import assert from 'node:assert/strict'
import { mediaKindForPath, mediaUrlFor } from '../src/media/media.js'
import { formatBytes, formatClock } from '../src/runtime/format.js'

const ascii = text => [...text].map(char => char.charCodeAt(0))
const mp4 = new Uint8Array([...ascii('\0\0\0\x20ftypisom'), 0, 0, 0, 0])
const m4a = new Uint8Array([...ascii('\0\0\0\x20ftypM4A '), 0, 0, 0, 0])
const wav = new Uint8Array([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE')])
const bad = new Uint8Array([0x50, 0x4b, 3, 4])

test('media kind follows the suffix family', () => {
  assert.equal(mediaKindForPath('a.mp3'), 'audio')
  assert.equal(mediaKindForPath('a.m4a'), 'audio')
  assert.equal(mediaKindForPath('a.mp4'), 'video')
  assert.equal(mediaKindForPath('a.webm'), 'video')
  assert.equal(mediaKindForPath('a.unknown'), undefined)
})

test('media URL uses sniffed magic and maps audio MP4 brands', () => {
  assert.deepEqual(mediaUrlFor(mp4, 'a.mp4'), { kind: 'video', mediaType: 'video/mp4' })
  assert.deepEqual(mediaUrlFor(m4a, 'a.m4a'), { kind: 'audio', mediaType: 'audio/mp4' })
  assert.deepEqual(mediaUrlFor(wav, 'a.wav'), { kind: 'audio', mediaType: 'audio/wav' })
  assert.equal(mediaUrlFor(bad, 'a.mp4'), undefined)
})

test('byte and clock formatters use locale keys', () => {
  const t = (key, params) => `${key}:${params?.value ?? ''}`
  assert.equal(formatBytes(t, 512), 'size.bytes:512')
  assert.match(formatBytes(t, 1536), /size\.kib:1\.5/)
  assert.match(formatBytes(t, 2 * 1024 * 1024), /size\.mib:2/)
  assert.equal(formatClock(65), '1:05')
  assert.equal(formatClock(3600), '1:00:00')
})
