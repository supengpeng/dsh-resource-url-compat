import test from 'node:test'
import assert from 'node:assert/strict'
import { imageMediaTypeForPath, withinPixelLimit } from '../src/image/image.js'
import { LIMITS } from '../src/runtime/limits.js'

test('maps extra image suffixes to native media types', () => {
  assert.equal(imageMediaTypeForPath('a.avif'), 'image/avif')
  assert.equal(imageMediaTypeForPath('a.tif'), 'image/tiff')
  assert.equal(imageMediaTypeForPath('a.tiff'), 'image/tiff')
  assert.equal(imageMediaTypeForPath('a.heic'), 'image/heic')
  assert.equal(imageMediaTypeForPath('a.heif'), 'image/heif')
  assert.equal(imageMediaTypeForPath('a.png'), undefined)
})

test('enforces the pixel and dimension caps', () => {
  assert.equal(withinPixelLimit(4000, 3000), true)
  assert.equal(withinPixelLimit(LIMITS.maxImageDimension + 1, 1), false)
  assert.equal(withinPixelLimit(5000, 4000), false)
  assert.equal(withinPixelLimit(0, 0), false)
})
