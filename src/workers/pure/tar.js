/** Bounded TAR/ustar/PAX parsing and gzip helpers. */
import { LIMITS } from '../../runtime/limits.js'
import { safeArchivePath } from './path-safety.js'
import { decompress } from './streams.js'
import { previewBytes as previewBytesImport } from './zip.js'

class TarError extends Error {
  /** @param {'invalid' | 'tooLarge' | 'unsupported'} code - stable failure class. */
  constructor(code) {
    super(code)
    this.code = code
  }
}

const invalid = () => { throw new TarError('invalid') }
const tooLarge = () => { throw new TarError('tooLarge') }

{
  // Keeps module-level constants out of the exported surface.
}

/**
 * Read a TAR octal or base-256 numeric field.
 * @param {Uint8Array} bytes - header.
 * @param {number} offset - field start.
 * @param {number} length - field length.
 * @returns {number} the value.
 */
function numberField(bytes, offset, length) {
  if (bytes[offset] === 0x80) {
    let value = 0
    for (let index = offset + 1; index < offset + length; index += 1) value = value * 256 + bytes[index]
    if (!Number.isSafeInteger(value)) tooLarge()
    return value
  }
  const text = String.fromCharCode(...bytes.subarray(offset, offset + length)).replace(/\0.*$/, '').trim()
  if (text === '') return 0
  if (!/^[0-7]+$/u.test(text)) invalid()
  const value = parseInt(text, 8)
  if (!Number.isSafeInteger(value)) tooLarge()
  return value
}

/**
 * Read a NUL-terminated string field.
 * @param {Uint8Array} bytes - header.
 * @param {number} offset - start.
 * @param {number} length - maximum length.
 * @returns {string} decoded field.
 */
function textField(bytes, offset, length) {
  const end = Math.min(bytes.length, offset + length)
  let at = offset
  while (at < end && bytes[at] !== 0) at += 1
  let text = ''
  for (let index = offset; index < at; index += 1) text += String.fromCharCode(bytes[index])
  return text
}

/**
 * Parse a PAX header's key/value lines.
 * @param {Uint8Array} bytes - PAX payload.
 * @returns {{ path?: string, size?: number }} values applied to the next entry.
 */
function paxOf(bytes) {
  const values = {}
  let offset = 0
  while (offset < bytes.length) {
    let space = offset
    while (space < bytes.length && bytes[space] !== 0x20) space += 1
    if (space - offset > 64) invalid()
    const length = Number.parseInt(String.fromCharCode(...bytes.subarray(offset, space)), 10)
    if (!Number.isFinite(length) || length <= 0 || offset + length > bytes.length) break
    const line = String.fromCharCode(...bytes.subarray(space + 1, offset + length - 1))
    const equals = line.indexOf('=')
    if (equals > 0) {
      const key = line.slice(0, equals)
      const value = line.slice(equals + 1)
      if (key === 'path') values.path = value
      else if (key === 'size' && /^[0-9]+$/u.test(value)) values.size = Number.parseInt(value, 10)
    }
    offset += length
  }
  return values
}

/**
 * Parse a TAR byte stream into bounded entries.
 * @param {Uint8Array} bytes - complete TAR bytes.
 * @param {typeof LIMITS} [limits] - caps.
 * @returns {{ entries: object[], truncated: boolean }} entries.
 */
export function parseTar(bytes, limits = LIMITS) {
  const entries = []
  let offset = 0
  let pendingPath
  let pendingSize
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512)
    if (header.every(byte => byte === 0)) break
    const name = textField(header, 0, 100)
    const prefix = textField(header, 345, 155)
    const type = String.fromCharCode(header[156])
    const size = pendingSize ?? numberField(header, 124, 12)
    const dataStart = offset + 512
    const padded = Math.ceil(size / 512) * 512
    if (dataStart + size > bytes.length || dataStart + padded > bytes.length) invalid()
    const data = bytes.subarray(dataStart, dataStart + size)
    if (type === 'x' || type === 'L') {
      const pax = type === 'x' ? paxOf(data) : { path: textField(data, 0, data.length) }
      if (pax.path !== undefined) pendingPath = pax.path
      if (pax.size !== undefined) pendingSize = pax.size
      offset = dataStart + padded
      continue
    }
    if (entries.length >= limits.maxEntries) tooLarge()
    const rawPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
    const rawPath = pendingPath ?? (rawPrefix !== '' ? `${rawPrefix}/${name}` : name)
    const safe = safeArchivePath(rawPath, limits)
    entries.push({
      path: safe.display,
      bytes: size,
      compressedBytes: size,
      method: 0,
      encrypted: false,
      unsafe: safe.unsafe,
      bomb: size > limits.maxEntryBytes,
      ratio: 1,
      directory: type === '5' || name.endsWith('/'),
      index: entries.length,
      dataOffset: dataStart,
    })
    pendingPath = undefined
    pendingSize = undefined
    offset = dataStart + padded
  }
  return { entries, truncated: false }
}

/**
 * Read one TAR entry into a bounded text or image preview.
 * @param {Uint8Array} bytes - complete TAR bytes.
 * @param {number} index - entry index.
 * @param {typeof LIMITS} limits - caps.
 * @returns {object} preview content.
 */
export function readTarEntry(bytes, index, limits = LIMITS) {
  const parsed = parseTar(bytes, limits)
  const entry = parsed.entries[index]
  if (entry === undefined) invalid()
  if (entry.directory) return { kind: 'unsupported', reason: 'directory' }
  if (entry.unsafe) return { kind: 'unsupported', reason: 'unsafePath' }
  if (entry.bytes > limits.maxEntryBytes) tooLarge()
  const data = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.bytes)
  return previewBytesImport(data, limits)
}

/**
 * Parse a gzip header's optional file name and modification time.
 * @param {Uint8Array} bytes - gzip bytes.
 * @returns {{ name?: string, mtime?: number }} header metadata.
 */
export function parseGzip(bytes) {
  if (bytes.length < 18 || bytes[0] !== 0x1f || bytes[1] !== 0x8b || bytes[2] !== 8) invalid()
  const flags = bytes[3]
  let offset = 10
  const mtime = (bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24)) >>> 0
  if ((flags & 4) === 4) {
    if (offset + 2 > bytes.length) invalid()
    const extra = bytes[offset] | (bytes[offset + 1] << 8)
    offset += 2 + extra
    if (offset > bytes.length) invalid()
  }
  let name
  if ((flags & 8) === 8) {
    if (offset >= bytes.length) invalid()
    const start = offset
    while (offset < bytes.length && bytes[offset] !== 0) offset += 1
    name = String.fromCharCode(...bytes.subarray(start, offset))
    offset += 1
  }
  if ((flags & 16) === 16) {
    while (offset < bytes.length && bytes[offset] !== 0) offset += 1
    offset += 1
  }
  if (offset > bytes.length) invalid()
  const size = bytes.length >= 4
    ? (bytes[bytes.length - 4] | (bytes[bytes.length - 3] << 8) | (bytes[bytes.length - 2] << 16) | (bytes[bytes.length - 1] << 24)) >>> 0
    : undefined
  return { name, mtime, size }
}

/**
 * Decompress gzip and parse the contained TAR.
 * @param {Uint8Array} bytes - gzip bytes.
 * @param {typeof LIMITS} limits - caps.
 * @returns {Promise<object>} TAR entries.
 */
export async function parseTarGz(bytes, limits = LIMITS) {
  const inflated = await decompress(bytes, 'gzip', limits.maxExtractedBytes)
  return parseTar(inflated, limits)
}

/**
 * Decompress a single gzip file for display.
 * @param {Uint8Array} bytes - gzip bytes.
 * @param {typeof LIMITS} limits - caps.
 * @returns {Promise<object>} preview content.
 */
export async function readGzip(bytes, limits = LIMITS) {
  const inflated = await decompress(bytes, 'gzip', limits.maxExtractedBytes)
  if (inflated.length > limits.maxTextEntryBytes) {
    if (inflated.length > limits.maxImageEntryBytes) tooLarge()
  }
  if (inflated.length > limits.maxTextEntryBytes) return { kind: 'unsupported', reason: 'tooLarge' }
  const text = String.fromCharCode(...inflated.subarray(0, 4096))
  if (text.includes('\u0000')) return { kind: 'unsupported', reason: 'binary' }
  try {
    return { kind: 'text', text: new TextDecoder('utf-8', { fatal: true }).decode(inflated), truncated: false }
  } catch {
    return { kind: 'unsupported', reason: 'encoding' }
  }
}
