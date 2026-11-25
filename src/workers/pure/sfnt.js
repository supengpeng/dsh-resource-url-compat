/** Bounded sfnt/WOFF/WOFF2 metadata parsing; glyph data is never decoded. */
import { LIMITS } from '../../runtime/limits.js'

const WOFF2_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm',
  'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern',
  'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC',
  'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar',
  'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty',
  'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill',
]

class SfntError extends Error {
  /**
   * @param {'invalid' | 'tooLarge'} code - stable failure class.
   */
  constructor(code) {
    super(code)
    this.code = code
    this.name = 'SfntError'
  }
}

const invalid = () => { throw new SfntError('invalid') }
const tooLarge = () => { throw new SfntError('tooLarge') }
const tagAt = (bytes, offset) => String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])
const u16 = (view, offset) => view.getUint16(offset, false)
const u32 = (view, offset) => view.getUint32(offset, false)

function requireRange(bytes, offset, length) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > bytes.length) invalid()
}

/**
 * Parse a TTF/OTF table directory, recording tags and numeric tables.
 * @param {Uint8Array} bytes - complete font bytes.
 * @param {typeof LIMITS} limits - parser limits.
 * @param {'ttf' | 'otf'} format - container format.
 * @returns {object | Promise<object>} metadata.
 */
function parseSfntDirectory(bytes, limits, format) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = u16(view, 4)
  if (count > limits.maxFontTables) tooLarge()
  const end = 12 + count * 16
  if (end > bytes.length) invalid()
  const tables = []
  const records = new Map()
  for (let index = 0; index < count; index += 1) {
    const at = 12 + index * 16
    const tag = tagAt(bytes, at)
    const offset = u32(view, at + 8)
    const length = u32(view, at + 12)
    requireRange(bytes, offset, length)
    tables.push(tag)
    records.set(tag, { offset, length })
  }
  const names = namesOf(records.get('name') === undefined ? undefined : bytes.subarray(records.get('name').offset, records.get('name').offset + records.get('name').length), limits)
  const metadata = { format, tables, truncated: false }
  if (names.family !== undefined) metadata.family = names.family
  if (names.subfamily !== undefined) metadata.subfamily = names.subfamily
  if (names.fullName !== undefined) metadata.fullName = names.fullName
  if (names.version !== undefined) metadata.version = names.version
  const head = tableBytes(bytes, records.get('head'))
  if (head !== undefined && head.length >= 20) metadata.unitsPerEm = u16(new DataView(head.buffer, head.byteOffset, head.byteLength), 18)
  const hhea = tableBytes(bytes, records.get('hhea'))
  if (hhea !== undefined && hhea.length >= 8) {
    const hheaView = new DataView(hhea.buffer, hhea.byteOffset, hhea.byteLength)
    metadata.ascender = hheaView.getInt16(4, false)
    metadata.descender = hheaView.getInt16(6, false)
  }
  const maxp = tableBytes(bytes, records.get('maxp'))
  if (maxp !== undefined && maxp.length >= 6) metadata.glyphs = u16(new DataView(maxp.buffer, maxp.byteOffset, maxp.byteLength), 4)
  const os2 = tableBytes(bytes, records.get('OS/2'))
  if (os2 !== undefined && os2.length >= 8) {
    const os2View = new DataView(os2.buffer, os2.byteOffset, os2.byteLength)
    metadata.weight = os2View.getUint16(4, false)
  }
  const fvar = tableBytes(bytes, records.get('fvar'))
  if (fvar !== undefined && fvar.length >= 16) {
    const fvarView = new DataView(fvar.buffer, fvar.byteOffset, fvar.byteLength)
    const axisCount = fvarView.getUint16(8, false)
    const axisSize = fvarView.getUint16(10, false)
    const dataOffset = fvarView.getUint16(4, false)
    if (axisCount > 0 && axisCount <= 32 && axisSize >= 4 && dataOffset + axisCount * axisSize <= fvar.length) {
      const axes = []
      for (let axis = 0; axis < axisCount; axis += 1) axes.push(tagAt(fvar, dataOffset + axis * axisSize))
      metadata.axes = axes
    }
  }
  return metadata
}

/**
 * Slice one table's bytes.
 * @param {Uint8Array} bytes - complete container.
 * @param {{ offset: number, length: number } | undefined} record - table record.
 * @returns {Uint8Array | undefined} the table bytes.
 */
function tableBytes(bytes, record) {
  if (record === undefined) return undefined
  requireRange(bytes, record.offset, record.length)
  return bytes.subarray(record.offset, record.offset + record.length)
}

/**
 * Parse a `name` table into the best family/style/full-name/version strings.
 * @param {Uint8Array | undefined} table - name table bytes.
 * @param {typeof LIMITS} limits - parser limits.
 * @returns {{ family?: string, subfamily?: string, fullName?: string, version?: string }} names.
 */
function namesOf(table, limits) {
  if (table === undefined || table.length < 6) return {}
  const view = new DataView(table.buffer, table.byteOffset, table.byteLength)
  const format = u16(view, 0)
  if (format !== 0 && format !== 1) return {}
  const count = u16(view, 2)
  if (count > limits.maxFontNameRecords) tooLarge()
  const stringOffset = u16(view, 4)
  if (6 + count * 12 > table.length || stringOffset > table.length) invalid()
  const best = new Map()
  for (let index = 0; index < count; index += 1) {
    const at = 6 + index * 12
    const platform = u16(view, at)
    const encoding = u16(view, at + 2)
    const nameId = u16(view, at + 6)
    const length = u16(view, at + 8)
    const offset = u16(view, at + 10)
    if (![1, 2, 4, 5].includes(nameId)) continue
    if (!((platform === 3 && (encoding === 1 || encoding === 10)) || platform === 0)) continue
    if (length > limits.maxFontNameBytes || offset + length > table.length - stringOffset) continue
    const start = stringOffset + offset
    let text = ''
    for (let index2 = 0; index2 + 1 < length; index2 += 2) {
      text += String.fromCharCode((table[start + index2] << 8) | table[start + index2 + 1])
    }
    const score = platform === 3 && encoding === 10 ? 4 : platform === 3 ? 3 : 2
    const held = best.get(nameId)
    if (held === undefined || score > held.score) best.set(nameId, { score, text })
  }
  const name = id => best.get(id)?.text
  return { family: name(1), subfamily: name(2), fullName: name(4), version: name(5) }
}

/**
 * Decompress a WOFF table with the native zlib stream.
 * @param {Uint8Array} bytes - compressed bytes.
 * @param {number} maxBytes - decompressed byte cap.
 * @returns {Promise<Uint8Array | undefined>} decompressed bytes, or undefined without native support.
 */
async function inflate(bytes, maxBytes) {
  if (typeof DecompressionStream !== 'function') return undefined
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))
  const reader = stream.getReader()
  const chunks = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!(value instanceof Uint8Array)) invalid()
      total += value.byteLength
      if (total > maxBytes) { await reader.cancel(); tooLarge() }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
  return result
}

/**
 * Read a WOFF table directory.
 * @param {Uint8Array} bytes - complete WOFF bytes.
 * @param {typeof LIMITS} limits - parser limits.
 * @returns {Promise<object>} metadata.
 */
async function parseWoff(bytes, limits) {
  if (bytes.length < 44) invalid()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = u16(view, 12)
  if (count > limits.maxFontTables) tooLarge()
  const end = 44 + count * 20
  if (end > bytes.length) invalid()
  const tables = []
  const records = new Map()
  for (let index = 0; index < count; index += 1) {
    const at = 44 + index * 20
    const tag = tagAt(bytes, at)
    const offset = u32(view, at + 4)
    const compressed = u32(view, at + 8)
    const original = u32(view, at + 12)
    requireRange(bytes, offset, compressed)
    tables.push(tag)
    records.set(tag, { offset, compressed, original })
  }
  const nameRecord = records.get('name')
  let nameTable
  if (nameRecord !== undefined) {
    if (nameRecord.compressed === nameRecord.original) {
      nameTable = bytes.subarray(nameRecord.offset, nameRecord.offset + nameRecord.original)
    } else {
      nameTable = await inflate(bytes.subarray(nameRecord.offset, nameRecord.offset + nameRecord.compressed), limits.maxFontNameTableBytes)
    }
  }
  const names = namesOf(nameTable, limits)
  const metadata = { format: 'woff', tables, truncated: nameTable === undefined && nameRecord !== undefined }
  if (names.family !== undefined) metadata.family = names.family
  if (names.subfamily !== undefined) metadata.subfamily = names.subfamily
  if (names.fullName !== undefined) metadata.fullName = names.fullName
  if (names.version !== undefined) metadata.version = names.version
  return metadata
}

/**
 * Read a UIntBase128 value.
 * @param {Uint8Array} bytes - directory bytes.
 * @param {number} start - first byte.
 * @returns {{ value: number, next: number }} the value and next offset.
 */
function base128(bytes, start) {
  let value = 0
  for (let index = 0; index < 5; index += 1) {
    const at = start + index
    if (at >= bytes.length) invalid()
    const byte = bytes[at]
    value = value * 128 + (byte & 0x7f)
    if (value > Number.MAX_SAFE_INTEGER) invalid()
    if ((byte & 0x80) === 0) return { value, next: at + 1 }
  }
  invalid()
}

/**
 * Read a WOFF2 table directory without Brotli decompression.
 * @param {Uint8Array} bytes - complete WOFF2 bytes.
 * @param {typeof LIMITS} limits - parser limits.
 * @returns {object} metadata.
 */
function parseWoff2(bytes, limits) {
  if (bytes.length < 48) invalid()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = u16(view, 12)
  if (count > limits.maxFontTables) tooLarge()
  const tables = []
  let offset = 48
  for (let index = 0; index < count; index += 1) {
    if (offset >= bytes.length) invalid()
    const flags = bytes[offset]
    offset += 1
    const tagIndex = flags & 0x3f
    let tag
    if (tagIndex === 0x3f) {
      if (offset + 4 > bytes.length) invalid()
      tag = tagAt(bytes, offset)
      offset += 4
    } else {
      tag = WOFF2_TAGS[tagIndex]
      if (tag === undefined) invalid()
    }
    const length = base128(bytes, offset)
    offset = length.next
    if ((tag === 'glyf' || tag === 'loca') && (flags >> 6) === 0) {
      const transformed = base128(bytes, offset)
      offset = transformed.next
    } else if ((flags >> 6) !== 0) {
      invalid()
    }
    tables.push(tag)
  }
  return { format: 'woff2', tables, truncated: true }
}

/**
 * Parse metadata from a TTF/OTF/WOFF/WOFF2 font.
 * @param {Uint8Array} bytes - complete font bytes.
 * @param {typeof LIMITS} [limits] - parser limits.
 * @returns {Promise<object>} bounded metadata.
 */
export async function parseSfnt(bytes, limits = LIMITS) {
  try {
    if (!(bytes instanceof Uint8Array) || bytes.length < 4) invalid()
    const signature = tagAt(bytes, 0)
    if (signature === 'wOFF') return await parseWoff(bytes, limits)
    if (signature === 'wOF2') return parseWoff2(bytes, limits)
    const trueType = bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0
    if (trueType || signature === 'OTTO' || signature === 'true' || signature === 'typ1') {
      return parseSfntDirectory(bytes, limits, signature === 'OTTO' ? 'otf' : 'ttf')
    }
    invalid()
  } catch (error) {
    if (error instanceof SfntError) throw error
    throw new SfntError('invalid')
  }
}
