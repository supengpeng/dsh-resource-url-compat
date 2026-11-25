/** Extra image suffix and pixel-limit rules. */
import { suffixOf } from '../runtime/path.js'
import { LIMITS } from '../runtime/limits.js'

const IMAGE_TYPES = {
  avif: 'image/avif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  heic: 'image/heic',
  heif: 'image/heif',
}

/**
 * Map an extra image suffix to the Blob media type the browser should attempt.
 * @param {string} path - file path.
 * @returns {string | undefined} the image media type.
 */
export function imageMediaTypeForPath(path) {
  return IMAGE_TYPES[suffixOf(path)]
}

/**
 * Whether an image's intrinsic dimensions stay within the preview allocation.
 * @param {number} width - intrinsic width.
 * @param {number} height - intrinsic height.
 * @returns {boolean} true when both axes and the pixel product are bounded.
 */
export function withinPixelLimit(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) return false
  if (width > LIMITS.maxImageDimension || height > LIMITS.maxImageDimension) return false
  return width * height <= LIMITS.maxImagePixels
}
