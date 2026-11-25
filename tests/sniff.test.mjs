import test from 'node:test'
import assert from 'node:assert/strict'
import { sniffMedia } from '../src/runtime/sniff.js'

const bytesOf = (...values) => new Uint8Array(values)
const ascii = text => [...text].map(char => char.charCodeAt(0))
const known = bytes => new Uint8Array([...bytes])

test('recognizes MP4, WebM, WAV, FLAC, OGG, and MP3 containers', () => {
  assert.deepEqual(sniffMedia(known([...bytesOf(0, 0, 0, 0x20), ...ascii('ftypisom')])), { kind: 'video', mediaType: 'video/mp4' })
  assert.deepEqual(sniffMedia(known([...bytesOf(0x1a, 0x45, 0xdf, 0xa3)] )), { kind: 'video', mediaType: 'video/webm' })
  assert.deepEqual(sniffMedia(known([...bytesOf(0x52, 0x49, 0x46, 0x46), 0, 0, 0, 0, ...ascii('WAVE')])), { kind: 'audio', mediaType: 'audio/wav' })
  assert.deepEqual(sniffMedia(known([...ascii('fLaC')])), { kind: 'audio', mediaType: 'audio/flac' })
  assert.deepEqual(sniffMedia(known([...ascii('OggS')])), { kind: 'audio', mediaType: 'audio/ogg' })
  assert.deepEqual(sniffMedia(known([...ascii('ID3'), 0, 0, 0])), { kind: 'audio', mediaType: 'audio/mpeg' })
  assert.deepEqual(sniffMedia(known([0xff, 0xfb, 0x90, 0x64])), { kind: 'audio', mediaType: 'audio/mpeg' })
})

test('recognizes AVI and FLV as video', () => {
  assert.deepEqual(sniffMedia(known([...bytesOf(0x52, 0x49, 0x46, 0x46), 0, 0, 0, 0, ...ascii('AVI ')])), { kind: 'video', mediaType: 'video/x-msvideo' })
  assert.deepEqual(sniffMedia(known([...ascii('FLV'), 1, 0])), { kind: 'video', mediaType: 'video/x-flv' })
})

test('returns undefined for unknown or truncated bytes', () => {
  assert.equal(sniffMedia(known([0x50, 0x4b, 0x03, 0x04])), undefined)
  assert.equal(sniffMedia(new Uint8Array(0)), undefined)
  assert.equal(sniffMedia(known([0xff, 0xfb])), undefined)
})
