/** Structural validation of every Worker result crossing into the UI. */
import { LIMITS } from './limits.js'

const FONT_FORMATS = new Set(['ttf', 'otf', 'woff', 'woff2'])
const BINARY_FORMATS = new Set([
  'elf', 'pe', 'macho', 'wasm', 'sqlite', 'psd', 'zip', 'gzip', 'bzip2', 'xz',
  'zstd', '7z', 'rar', 'iso', 'dmg', 'class', 'pyc', 'tar', 'pdf', 'unknown',
])
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'])

const invalid = () => { throw new Error('invalid') }
const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value)
const isInt = value => Number.isSafeInteger(value) && value >= 0
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
const isSignedNumber = value => typeof value === 'number' && Number.isFinite(value)
const isString = (value, max) => typeof value === 'string' && value.length <= max

function entryOf(value) {
  if (!isObject(value)) invalid()
  if (!isString(value.path, LIMITS.maxPathChars)) invalid()
  if (!isInt(value.bytes) || !isInt(value.compressedBytes)) invalid()
  if (!isInt(value.method) || value.method > 255) invalid()
  for (const key of ['encrypted', 'unsafe', 'bomb']) if (typeof value[key] !== 'boolean') invalid()
  if (!isFiniteNumber(value.ratio)) invalid()
  if (value.directory !== undefined && typeof value.directory !== 'boolean') invalid()
  return value
}

function archiveList(value) {
  if (!isObject(value) || !Array.isArray(value.entries) || typeof value.truncated !== 'boolean') invalid()
  if (value.entries.length > LIMITS.maxEntries) invalid()
  return { entries: value.entries.map(entryOf), truncated: value.truncated }
}

function archiveEntry(value) {
  if (!isObject(value) || typeof value.kind !== 'string') invalid()
  if (value.kind === 'text') {
    if (!isString(value.text, LIMITS.maxTextEntryBytes) || typeof value.truncated !== 'boolean') invalid()
    return value
  }
  if (value.kind === 'image') {
    if (!(value.bytes instanceof Uint8Array) || value.bytes.byteLength > LIMITS.maxImageEntryBytes) invalid()
    if (typeof value.mediaType !== 'string' || !IMAGE_TYPES.has(value.mediaType)) invalid()
    return value
  }
  if (value.kind === 'unsupported') {
    if (!isString(value.reason, 256)) invalid()
    return value
  }
  invalid()
}

function fontMeta(value) {
  if (!isObject(value) || typeof value.format !== 'string' || !FONT_FORMATS.has(value.format)) invalid()
  if (!Array.isArray(value.tables) || value.tables.length > LIMITS.maxFontTables) invalid()
  if (!value.tables.every(tag => isString(tag, 16)) || typeof value.truncated !== 'boolean') invalid()
  for (const key of ['family', 'subfamily', 'fullName', 'version']) {
    if (value[key] !== undefined && !isString(value[key], LIMITS.maxFontNameBytes)) invalid()
  }
  for (const key of ['unitsPerEm', 'weight', 'glyphs']) {
    if (value[key] !== undefined && !isFiniteNumber(value[key])) invalid()
  }
  for (const key of ['ascender', 'descender']) {
    if (value[key] !== undefined && !isSignedNumber(value[key])) invalid()
  }
  if (value.axes !== undefined && (!Array.isArray(value.axes) || value.axes.length > 32 || !value.axes.every(tag => isString(tag, 64)))) invalid()
  return value
}

function binaryScan(value) {
  if (!isObject(value) || typeof value.format !== 'string' || !BINARY_FORMATS.has(value.format)) invalid()
  if (!Array.isArray(value.summary) || value.summary.length > 32 || !value.summary.every(line => isString(line, 256))) invalid()
  if (!Array.isArray(value.strings) || value.strings.length > LIMITS.maxBinaryStrings
    || !value.strings.every(line => isString(line, LIMITS.maxBinaryStringLength)) || typeof value.truncated !== 'boolean') invalid()
  return value
}

/**
 * Validate one Worker result for a task kind.
 * @param {string} kind - task kind.
 * @param {unknown} value - Worker's `value` payload.
 * @returns {unknown} the same value when every field is bounded and typed.
 */
export function validateWorkerResult(kind, value) {
  if (kind === 'archive-list') return archiveList(value)
  if (kind === 'archive-entry') return archiveEntry(value)
  if (kind === 'font-meta') return fontMeta(value)
  if (kind === 'binary-scan') return binaryScan(value)
  return invalid()
}
