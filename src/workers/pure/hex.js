/** Hex page formatting shared by the binary body and its tests. */

/**
 * Format one page of bytes as 16-byte rows.
 * @param {Uint8Array} bytes - source bytes.
 * @param {number} start - first byte index.
 * @param {number} length - requested window length.
 * @returns {{ offset: number, rows: { offset: number, hex: string, ascii: string }[] }} rows.
 */
export function hexPage(bytes, start, length) {
  const from = Math.max(0, Number.isSafeInteger(start) ? start : 0)
  const size = Math.min(bytes.length - from, Math.max(0, length))
  if (size <= 0) return { offset: from, rows: [] }
  const rows = []
  for (let at = 0; at < size; at += 16) {
    const offset = from + at
    const end = Math.min(bytes.length, offset + 16)
    const parts = []
    let ascii = ''
    for (let index = offset; index < end; index += 1) {
      const byte = bytes[index]
      parts.push(byte.toString(16).padStart(2, '0').toUpperCase())
      ascii += byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.'
    }
    rows.push({ offset, hex: parts.join(' '), ascii })
  }
  return { offset: from, rows }
}
