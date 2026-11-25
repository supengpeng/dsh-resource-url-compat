/** Preview-family metadata shared by the entry and the unit tests. */

const ID = 'dsh-resource-url-compat'

const MEDIA = [
  'mp4', 'm4v', 'mov', 'webm', 'mkv', 'ogv', 'avi', 'flv', 'wmv',
  'mp3', 'wav', 'flac', 'ogg', 'oga', 'm4a', 'aac', 'opus', 'wma',
]
const IMAGE = ['avif', 'tif', 'tiff', 'heic', 'heif']
const FONT = ['ttf', 'otf', 'woff', 'woff2']
const ARCHIVE = ['zip', 'jar', 'tar', 'gz', 'tgz', 'tar.gz']
const OTHER = [
  'wasm', 'exe', 'dll', 'so', 'dylib', 'bin', 'o', 'class', 'pyc', 'sqlite', 'db',
  'dmg', 'iso', 'img', 'psd', 'ai', 'sketch', 'bz2', 'xz', 'zst', '7z', 'rar', 'eot',
  'odt', 'ods', 'odp', 'pages', 'numbers',
]
const ALL = [...MEDIA, ...IMAGE, ...FONT, ...ARCHIVE, ...OTHER]

/**
 * One format family's metadata.
 * @typedef {object} Family
 * @property {string} id - document preview implementation identity.
 * @property {string} chunk - package-local chunk file name.
 * @property {readonly string[]} extensions - suffixes this family claims.
 * @property {readonly string[]} binaryExtensions - binary suffixes among those.
 * @property {string} titleKey - locale key for the viewer label.
 */

/** @type {readonly Family[]} */
export const FAMILY_DEFINITIONS = [
  { id: `${ID}/media`, chunk: 'client.media.js', extensions: MEDIA, binaryExtensions: MEDIA, titleKey: 'viewer.media' },
  { id: `${ID}/image`, chunk: 'client.image.js', extensions: IMAGE, binaryExtensions: IMAGE, titleKey: 'viewer.image' },
  { id: `${ID}/font`, chunk: 'client.font.js', extensions: FONT, binaryExtensions: FONT, titleKey: 'viewer.font' },
  { id: `${ID}/archive`, chunk: 'client.archive.js', extensions: ARCHIVE, binaryExtensions: ARCHIVE, titleKey: 'viewer.archive' },
  { id: `${ID}/binary`, chunk: 'client.binary.js', extensions: ALL, binaryExtensions: ALL, titleKey: 'viewer.binary' },
]

/**
 * Build the document-preview definition for one family.
 * @param {Family} family - family metadata.
 * @param {(key: string) => string} t - bound locale translator.
 * @returns {object} a registration accepted by `ctx.documentPreviews.register`.
 */
export function definitionOf(family, t) {
  return {
    id: family.id,
    extensions: family.extensions,
    binaryExtensions: family.binaryExtensions,
    priority: 'extension',
    title: () => t(family.titleKey),
    loading: 'bytes-complete',
  }
}
