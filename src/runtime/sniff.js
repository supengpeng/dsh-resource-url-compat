/** Native media container sniffing from the first bytes; never trusts a suffix alone. */

const asciiAt = (bytes, offset, text) => {
  if (bytes.length < offset + text.length) return false
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false
  }
  return true
}

/**
 * Classify a media container from its magic bytes.
 * @param {Uint8Array} bytes - complete or partial file bytes.
 * @returns {{ kind: 'audio' | 'video', mediaType: string } | undefined} the native media type, or undefined when unknown.
 */
export function sniffMedia(bytes) {
  if (!(bytes instanceof Uint8Array)) return undefined
  if (asciiAt(bytes, 4, 'ftyp')) return { kind: 'video', mediaType: 'video/mp4' }
  if (asciiAt(bytes, 0, 'RIFF') && asciiAt(bytes, 8, 'WAVE')) return { kind: 'audio', mediaType: 'audio/wav' }
  if (asciiAt(bytes, 0, 'RIFF') && asciiAt(bytes, 8, 'AVI ')) return { kind: 'video', mediaType: 'video/x-msvideo' }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { kind: 'video', mediaType: 'video/webm' }
  }
  if (asciiAt(bytes, 0, 'fLaC')) return { kind: 'audio', mediaType: 'audio/flac' }
  if (asciiAt(bytes, 0, 'OggS')) return { kind: 'audio', mediaType: 'audio/ogg' }
  if (asciiAt(bytes, 0, 'ID3')) return { kind: 'audio', mediaType: 'audio/mpeg' }
  if (asciiAt(bytes, 0, 'FLV') && bytes[3] === 1) return { kind: 'video', mediaType: 'video/x-flv' }
  if (bytes.length >= 4 && (bytes[0] & 0xe0) === 0xe0 && (bytes[1] & 0xe0) === 0xe0) {
    return { kind: 'audio', mediaType: 'audio/mpeg' }
  }
  return undefined
}
