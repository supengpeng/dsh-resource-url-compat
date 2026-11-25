/** Native DecompressionStream helpers with a hard output cap. */

class StreamError extends Error {
  /** @param {'unsupported' | 'tooLarge' | 'invalid'} code - stable failure class. */
  constructor(code) {
    super(code)
    this.code = code
    this.name = 'StreamError'
  }
}

/**
 * Decompress one stream with the browser's native decoder.
 * @param {Uint8Array} bytes - compressed bytes.
 * @param {'gzip' | 'deflate' | 'deflate-raw'} format - native stream format.
 * @param {number} maxBytes - decompressed byte cap.
 * @returns {Promise<Uint8Array>} the decompressed bytes.
 */
export async function decompress(bytes, format, maxBytes) {
  if (typeof DecompressionStream !== 'function') throw new StreamError('unsupported')
  let reader
  try {
    reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format)).getReader()
  } catch {
    throw new StreamError('unsupported')
  }
  const chunks = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!(value instanceof Uint8Array)) throw new StreamError('invalid')
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new StreamError('tooLarge')
      }
      chunks.push(value)
    }
  } catch (error) {
    if (error instanceof StreamError) throw error
    throw new StreamError('invalid')
  } finally {
    reader.releaseLock()
  }
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength }
  return output
}
