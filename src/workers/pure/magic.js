/** Read-only binary structure and printable-string scanning. */
import { LIMITS } from '../../runtime/limits.js'

const asciiAt = (bytes, offset, text) => {
  if (bytes.length < offset + text.length) return false
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false
  }
  return true
}

const u16 = (view, at) => view.getUint16(at, true)
const u32 = (view, at) => view.getUint32(at, true)
const u16be = (view, at) => view.getUint16(at, false)
const u32be = (view, at) => view.getUint32(at, false)

/**
 * Detect a binary format from its leading magic and basic header.
 * @param {Uint8Array} bytes - file bytes.
 * @returns {string} a bounded format id.
 */
export function binaryFormatOf(bytes) {
  if (bytes.length >= 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) return 'elf'
  if (asciiAt(bytes, 0, 'MZ')) return 'pe'
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d) return 'wasm'
  if (asciiAt(bytes, 0, 'SQLite format 3')) return 'sqlite'
  if (asciiAt(bytes, 0, '8BPS')) return 'psd'
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5)) return 'zip'
  if (bytes.length >= 3 && bytes[0] === 0x1f && bytes[1] === 0x8b) return 'gzip'
  if (asciiAt(bytes, 0, 'BZh')) return 'bzip2'
  if (bytes.length >= 6 && bytes[0] === 0xfd && bytes[1] === 0x37 && bytes[2] === 0x7a && bytes[3] === 0x58 && bytes[4] === 0x5a && bytes[5] === 0x00) return 'xz'
  if (bytes.length >= 4 && bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd) return 'zstd'
  if (bytes.length >= 6 && bytes[0] === 0x37 && bytes[1] === 0x7a && bytes[2] === 0xbc && bytes[3] === 0xaf && bytes[4] === 0x27 && bytes[5] === 0x1c) return '7z'
  if (asciiAt(bytes, 0, 'Rar!')) return 'rar'
  if (asciiAt(bytes, 0, 'koly')) return 'dmg'
  if (bytes.length >= 5 && bytes[0] === 0xca && bytes[1] === 0xfe && bytes[2] === 0xba && bytes[3] === 0xbe) return 'class'
  if (bytes.length >= 4 && ((bytes[0] === 0xfe && bytes[1] === 0xed && bytes[2] === 0xfa && bytes[3] === 0xce)
    || (bytes[0] === 0xcf && bytes[1] === 0xfa && bytes[2] === 0xed && bytes[3] === 0xfe)
    || (bytes[0] === 0xfe && bytes[1] === 0xed && bytes[2] === 0xfa && bytes[3] === 0xcf)
    || (bytes[0] === 0xca && bytes[1] === 0xfe && bytes[2] === 0xba && bytes[3] === 0xbe))) return 'macho'
  if (asciiAt(bytes, 0, '%PDF')) return 'pdf'
  if (bytes.length > 262 && asciiAt(bytes, 257, 'ustar')) return 'tar'
  if (bytes.length > 32774 && asciiAt(bytes, 32769, 'CD001')) return 'iso'
  return 'unknown'
}

/**
 * Add a bounded detail token.
 * @param {string[]} summary - summary buffer.
 * @param {string} token - token.
 * @returns {void}
 */
function token(summary, value) {
  if (summary.length < 32) summary.push(value)
}

/**
 * Build a short structural summary without decoding or executing content.
 * @param {Uint8Array} bytes - file bytes.
 * @param {string} format - detected format.
 * @returns {string[]} summary tokens.
 */
function summaryOf(bytes, format) {
  const summary = []
  if (format === 'wasm' && bytes.length >= 8) {
    const version = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true)
    token(summary, `version=${version}`)
  }
  if (format === 'elf' && bytes.length >= 6) {
    token(summary, `class=${bytes[4] === 2 ? 64 : 32}`)
    token(summary, `endian=${bytes[5] === 2 ? 'be' : 'le'}`)
  }
  if (format === 'pe') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (bytes.length >= 0x40) {
      const pe = u32(view, 0x3c)
      token(summary, `peOffset=${pe}`)
      if (pe + 6 <= bytes.length && asciiAt(bytes, pe, 'PE')) {
        token(summary, `machine=${u16(view, pe + 4)}`)
        token(summary, `sections=${u16(view, pe + 6)}`)
      }
    }
  }
  if (format === 'sqlite') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (bytes.length >= 30) token(summary, `pageSize=${u16be(view, 16) === 1 ? 65536 : u16be(view, 16)}`)
    if (bytes.length >= 32) token(summary, `pages=${u32be(view, 28)}`)
    if (bytes.length >= 60) token(summary, `encoding=${u32be(view, 56)}`)
  }
  if (format === 'psd') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (bytes.length >= 26) {
      token(summary, `channels=${u16be(view, 12)}`)
      token(summary, `height=${u32be(view, 14)}`)
      token(summary, `width=${u32be(view, 18)}`)
      token(summary, `depth=${u16be(view, 22)}`)
      token(summary, `colorMode=${u16be(view, 24)}`)
    }
  }
  return summary
}

/**
 * Scan printable ASCII runs from the first bounded region.
 * @param {Uint8Array} bytes - file bytes.
 * @param {{ maxBinaryScanBytes: number, maxBinaryStrings: number, maxBinaryStringLength: number }} limits - caps.
 * @returns {string[]} strings.
 */
function stringsOf(bytes, limits) {
  const strings = []
  let current = ''
  const end = Math.min(bytes.length, limits.maxBinaryScanBytes)
  for (let index = 0; index < end; index += 1) {
    const byte = bytes[index]
    if (byte >= 0x20 && byte <= 0x7e) {
      if (current.length < limits.maxBinaryStringLength) current += String.fromCharCode(byte)
    } else {
      if (current.length >= 4 && strings.length < limits.maxBinaryStrings) strings.push(current)
      current = ''
    }
  }
  if (current.length >= 4 && strings.length < limits.maxBinaryStrings) strings.push(current)
  return strings
}

/**
 * Scan a binary's format, structure tokens, and printable strings.
 * @param {Uint8Array} bytes - file bytes.
 * @param {typeof LIMITS} [limits] - caps.
 * @returns {{ format: string, summary: string[], strings: string[], truncated: boolean }} scan result.
 */
export function scanBinary(bytes, limits = LIMITS) {
  if (!(bytes instanceof Uint8Array)) return { format: 'unknown', summary: [], strings: [], truncated: false }
  const format = binaryFormatOf(bytes)
  const end = Math.min(bytes.length, limits.maxBinaryScanBytes)
  return {
    format,
    summary: summaryOf(bytes.subarray(0, end), format),
    strings: stringsOf(bytes, limits),
    truncated: bytes.length > end,
  }
}
