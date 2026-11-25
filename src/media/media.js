/** Media suffix and container mapping for the native player body. */
import { fileNameOf, suffixOf } from '../runtime/path.js'
import { sniffMedia } from '../runtime/sniff.js'

const AUDIO = new Set(['mp3', 'wav', 'flac', 'ogg', 'oga', 'm4a', 'aac', 'opus', 'wma'])
const VIDEO = new Set(['mp4', 'm4v', 'mov', 'webm', 'mkv', 'ogv', 'avi', 'flv', 'wmv'])
const MP4_AUDIO_BRANDS = new Set(['M4A ', 'M4B '])

/**
 * Read the media family a suffix names.
 * @param {string} path - file path.
 * @returns {'audio' | 'video' | undefined} the media family.
 */
export function mediaKindForPath(path) {
  const suffix = suffixOf(path)
  if (AUDIO.has(suffix)) return 'audio'
  if (VIDEO.has(suffix)) return 'video'
  return undefined
}

/**
 * Read the native media URL kind and type for one file.
 * @param {Uint8Array} bytes - file bytes.
 * @param {string} path - file path.
 * @returns {{ kind: 'audio' | 'video', mediaType: string } | undefined} the native media type, or undefined.
 */
export function mediaUrlFor(bytes, path) {
  const sniffed = sniffMedia(bytes)
  if (sniffed === undefined) return undefined
  let kind = mediaKindForPath(path) ?? sniffed.kind
  let mediaType = sniffed.mediaType
  if (sniffed.mediaType === 'video/mp4') {
    const brand = brandOf(bytes)
    if (MP4_AUDIO_BRANDS.has(brand)) {
      kind = 'audio'
      mediaType = 'audio/mp4'
    } else if (kind === 'audio') {
      mediaType = 'audio/mp4'
    }
  }
  return { kind, mediaType }
}

/**
 * Read the MP4 `ftyp` brand.
 * @param {Uint8Array} bytes - file bytes.
 * @returns {string} the four-character brand, or empty.
 */
function brandOf(bytes) {
  if (bytes.length < 12) return ''
  return String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
}

/**
 * Map a DOM MediaError code to a locale key.
 * @param {number | undefined} code - `MediaError.code`.
 * @returns {string} locale key for the failure.
 */
export function mediaErrorKey(code) {
  if (code === 1) return 'media.error.aborted'
  if (code === 2) return 'media.error.network'
  if (code === 3) return 'media.error.decode'
  if (code === 4) return 'media.error.unsupported'
  return 'media.error.unknown'
}

/** @param {string} path - file path. @returns {string} display name. */
export function mediaDisplayName(path) {
  return fileNameOf(path)
}
