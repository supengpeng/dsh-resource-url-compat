/** Bounded ZIP central-directory parsing and one-entry extraction. */
import { LIMITS } from '../../runtime/limits.js'
import { safeArchivePath } from './path-safety.js'
import { decompress } from './streams.js'

class ZipError extends Error {
  /** @param {'invalid' | 'tooLarge' | 'unsupported' | 'encrypted' | 'bomb'} code - stable failure class. */
  constructor(code) {
    super(code)
    this.code = code
  }
}

const EOCD = 0x06054b50
const ZIP64_EOCD = 0x06064b50
const ZIP64_LOCATOR = 0x07064b50
const CENTRAL = 0x02014b50
const LOCAL = 0x04034b50
const TEXT_ENCODER = typeof TextDecoder === 'function' ? new TextDecoder('utf-8', { fatal: false }) : undefined

const invalid = () => { throw new ZipError('invalid') }
const tooLarge = () => { throw new ZipError('tooLarge') }
const unsupported = () => { throw new ZipError('unsupported') }

/**
 * Read a little-endian uint64 as a safe integer.
 * @param {DataView} view - source view.
 * @param {number} offset - byte offset.
 * @returns {number} the value.
 */
function u64(view, offset) {
  const low = view.getUint32(offset, true)
  const high = view.getUint32(offset + 4, true)
  if (high > 0x1fffff) tooLarge()
  const value = high * 0x100000000 + low
  if (!Number.isSafeInteger(value)) tooLarge()
  return value
}

/**
 * Find the end-of-central-directory record.
 * @param {Uint8Array} bytes - ZIP bytes.
 * @returns {{ view: DataView, offset: number }} EOCD location.
 */
function findEocd(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const start = Math.max(0, bytes.length - 65557)
  for (let offset = bytes.length - 22; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) !== EOCD) continue
    const comment = view.getUint16(offset + 20, true)
    if (offset + 22 + comment <= bytes.length) return { view, offset }
  }
  invalid()
}

/**
 * Read the ZIP central-directory bounds, including ZIP64.
 * @param {Uint8Array} bytes - ZIP bytes.
 * @param {{ maxEntries: number }} limits - entry cap.
 * @returns {{ offset: number, size: number, count: number }} central-directory bounds.
 */
function directoryBounds(bytes, limits) {
  const { view, offset } = findEocd(bytes)
  let count = view.getUint16(offset + 10, true)
  let size = view.getUint32(offset + 12, true)
  let directory = view.getUint32(offset + 16, true)
  if (view.getUint16(offset + 4, true) !== 0 || view.getUint16(offset + 6, true) !== 0) invalid()
  if (count === 0xffff || size === 0xffffffff || directory === 0xffffffff) {
    const locator = offset - 20
    if (locator < 0 || view.getUint32(locator, true) !== ZIP64_LOCATOR) invalid()
    const zip64 = u64(view, locator + 8)
    if (zip64 + 56 > bytes.length || view.getUint32(zip64, true) !== ZIP64_EOCD) invalid()
    count = u64(view, zip64 + 32)
    size = u64(view, zip64 + 40)
    directory = u64(view, zip64 + 48)
  }
  if (count > limits.maxEntries) tooLarge()
  if (directory + size > bytes.length) invalid()
  return { offset: directory, size, count }
}

/**
 * Decode a ZIP entry name.
 * @param {Uint8Array} bytes - ZIP bytes.
 * @param {number} offset - name start.
 * @param {number} length - name length.
 * @returns {string} decoded name.
 */
function nameOf(bytes, offset, length) {
  if (offset + length > bytes.length) invalid()
  if (TEXT_ENCODER === undefined) return ''
  try {
    return TEXT_ENCODER.decode(bytes.subarray(offset, offset + length))
  } catch {
    invalid()
  }
}

/**
 * Read a ZIP64 extra field for the sentinel sizes.
 * @param {Uint8Array} bytes - ZIP bytes.
 * @param {number} start - extra-field start.
 * @param {number} length - extra-field length.
 * @param {{ uncompressed: number, compressed: number, local: number }} sentinels - fields needing values.
 * @returns {{ uncompressed: number, compressed: number, local: number }} resolved values.
 */
function zip64(bytes, start, length, sentinels) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = start
  let end = start + length
  if (end > bytes.length) invalid()
  const values = { ...sentinels }
  while (offset + 4 <= end) {
    const id = view.getUint16(offset, true)
    const size = view.getUint16(offset + 2, true)
    offset += 4
    if (offset + size > end) invalid()
    if (id === 0x0001) {
      let at = offset
      if (values.uncompressed === 0xffffffff) { values.uncompressed = u64(view, at); at += 8 }
      if (values.compressed === 0xffffffff) { values.compressed = u64(view, at); at += 8 }
      if (values.local === 0xffffffff) { values.local = u64(view, at); at += 8 }
    }
    offset += size
  }
  return values
}

/**
 * Parse the central directory into bounded entry records.
 * @param {Uint8Array} bytes - ZIP bytes.
 * @param {typeof LIMITS} [limits] - caps.
 * @returns {{ entries: object[], truncated: boolean }} entries.
 */
export function parseZip(bytes, limits = LIMITS) {
  const { view } = findEocd(bytes)
  const bounds = directoryBounds(bytes, limits)
  const entries = []
  let offset = bounds.offset
  for (let index = 0; index < bounds.count; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== CENTRAL) invalid()
    const flags = view.getUint16(offset + 8, true)
    const method = view.getUint16(offset + 10, true)
    const compressed = view.getUint32(offset + 20, true)
    const uncompressed = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const local = view.getUint32(offset + 42, true)
    const nameStart = offset + 46
    const name = nameOf(bytes, nameStart, nameLength)
    const sentinelUncompressed = uncompressed === 0xffffffff
    const sentinelCompressed = compressed === 0xffffffff
    const sentinelLocal = local === 0xffffffff
    let resolved = { uncompressed, compressed, local }
    if (sentinelUncompressed || sentinelCompressed || sentinelLocal) {
      resolved = zip64(bytes, nameStart + nameLength, extraLength, resolved)
    }
    const safe = safeArchivePath(name, limits)
    const ratio = resolved.compressed === 0 ? (resolved.uncompressed === 0 ? 1 : Number.MAX_SAFE_INTEGER) : resolved.uncompressed / resolved.compressed
    entries.push({
      path: safe.display,
      bytes: resolved.uncompressed,
      compressedBytes: resolved.compressed,
      method,
      encrypted: (flags & 0x1) === 0x1,
      unsafe: safe.unsafe,
      bomb: ratio > limits.maxCompressionRatio || resolved.uncompressed > limits.maxEntryBytes,
      ratio,
      directory: name.endsWith('/'),
      index,
      local: resolved.local,
      compressedSize: resolved.compressed,
    })
    offset = nameStart + nameLength + extraLength + commentLength
  }
  return { entries, truncated: false }
}

/**
 * Decode a text entry and detect a small native image.
 * @param {Uint8Array} bytes - decompressed entry bytes.
 * @param {typeof LIMITS} limits - caps.
 * @returns {{ kind: 'text', text: string, truncated: boolean } | { kind: 'image', bytes: Uint8Array, mediaType: string } | { kind: 'unsupported', reason: string }} preview content.
 */
export function previewBytes(bytes, limits) {
  const image = imageType(bytes)
  if (image !== undefined) {
    if (bytes.length > limits.maxImageEntryBytes) tooLarge()
    return { kind: 'image', bytes, mediaType: image }
  }
  if (bytes.length > limits.maxTextEntryBytes) throw new ZipError('unsupported')
  if (TEXT_ENCODER === undefined) return { kind: 'unsupported', reason: 'encoding' }
  let text
  try { text = TEXT_ENCODER.decode(bytes) } catch { return { kind: 'unsupported', reason: 'encoding' } }
  if (text.includes('\u0000')) {
    const controls = [...text].filter(char => char.charCodeAt(0) < 9).length
    if (controls > 4) return { kind: 'unsupported', reason: 'binary' }
  }
  return { kind: 'text', text, truncated: false }
}

/**
 * Detect an image from its magic bytes.
 * @param {Uint8Array} bytes - candidate bytes.
 * @returns {string | undefined} media type.
 */
export function imageType(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
    && bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66) return 'image/avif'
  return undefined
}

/**
 * Read one ZIP entry into a bounded text or image preview.
 * @param {Uint8Array} bytes - ZIP bytes.
 * @param {number} index - central-directory entry index.
 * @param {typeof LIMITS} [limits] - caps.
 * @returns {Promise<object>} preview content.
 */
export async function readZipEntry(bytes, index, limits = LIMITS) {
  const parsed = parseZip(bytes, limits)
  const entry = parsed.entries[index]
  if (entry === undefined) invalid()
  if (entry.directory) return { kind: 'unsupported', reason: 'directory' }
  if (entry.unsafe) return { kind: 'unsupported', reason: 'unsafePath' }
  if (entry.encrypted) throw new ZipError('encrypted')
  if (entry.bytes > limits.maxEntryBytes) tooLarge()
  if (entry.bomb) throw new ZipError('bomb')
  if (entry.method !== 0 && entry.method !== 8) return { kind: 'unsupported', reason: 'method' }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const local = entry.local
  if (local + 30 > bytes.length || view.getUint32(local, true) !== LOCAL) invalid()
  const nameLength = view.getUint16(local + 26, true)
  const extraLength = view.getUint16(local + 28, true)
  const dataStart = local + 30 + nameLength + extraLength
  const compressedLength = entry.compressedSize
  if (dataStart + compressedLength > bytes.length) invalid()
  const compressed = bytes.subarray(dataStart, dataStart + compressedLength)
  let data
  if (entry.method === 0) {
    if (compressed.length > limits.maxEntryBytes) tooLarge()
    data = compressed
  } else {
    data = await decompress(compressed, 'deflate-raw', limits.maxEntryBytes)
  }
  return previewBytes(data, limits)
}
