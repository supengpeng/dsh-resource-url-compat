/** Disposable archive worker: list entries or extract one bounded preview. */
import { LIMITS } from '../runtime/limits.js'
import { decompress } from './pure/streams.js'
import { parseZip, readZipEntry } from './pure/zip.js'
import { parseTar, parseTarGz, readTarEntry, parseGzip, readGzip } from './pure/tar.js'

const FORMATS = new Set(['zip', 'tar', 'tgz', 'gz'])

/**
 * Build the list result for one archive format.
 * @param {object} request - validated worker request.
 * @returns {Promise<object>} list result.
 */
async function list(request) {
  if (request.format === 'zip') return parseZip(request.bytes, request.limits)
  if (request.format === 'tar') return parseTar(request.bytes, request.limits)
  if (request.format === 'tgz') return parseTarGz(request.bytes, request.limits)
  if (request.format === 'gz') {
    const info = parseGzip(request.bytes)
    const name = info.name === undefined || info.name === '' ? 'data' : info.name
    return {
      entries: [{
        path: name, bytes: info.size ?? 0, compressedBytes: request.bytes.length, method: 0,
        encrypted: false, unsafe: false, bomb: false, ratio: 1, directory: false, index: 0,
      }],
      truncated: false,
    }
  }
  throw Object.assign(new Error('unsupported'), { code: 'unsupported' })
}

/**
 * Extract one entry preview.
 * @param {object} request - validated worker request.
 * @returns {Promise<object>} preview content.
 */
async function entry(request) {
  if (request.format === 'zip') return readZipEntry(request.bytes, request.index, request.limits)
  if (request.format === 'tar') return readTarEntry(request.bytes, request.index, request.limits)
  if (request.format === 'gz') return readGzip(request.bytes, request.limits)
  if (request.format === 'tgz') {
    const tar = await decompress(request.bytes, 'gzip', request.limits.maxExtractedBytes)
    return readTarEntry(tar, request.index, request.limits)
  }
  throw Object.assign(new Error('unsupported'), { code: 'unsupported' })
}

/**
 * Install the archive worker handler.
 * @param {{ onmessage: (event: { data: unknown }) => void, postMessage: (value: unknown) => void }} scope - worker global.
 * @returns {void}
 */
export function archiveWorker(scope) {
  scope.onmessage = async (event) => {
    const request = event.data
    if (typeof request !== 'object' || request === null || request.v !== 1
      || !FORMATS.has(request.format) || !(request.bytes instanceof Uint8Array)
      || (request.kind !== 'archive-list' && request.kind !== 'archive-entry')) {
      scope.postMessage({ v: 1, ok: false, code: 'invalid' })
      return
    }
    if (request.kind === 'archive-entry' && !Number.isSafeInteger(request.index)) {
      scope.postMessage({ v: 1, ok: false, code: 'invalid' })
      return
    }
    try {
      const value = await (request.kind === 'archive-list' ? list(request) : entry(request))
      scope.postMessage({ v: 1, ok: true, value })
    } catch (error) {
      const code = typeof error?.code === 'string' ? error.code : 'invalid'
      scope.postMessage({ v: 1, ok: false, code })
    }
  }
}
