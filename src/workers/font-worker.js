/** Disposable font metadata worker; one request, one bounded response. */
import { LIMITS } from '../runtime/limits.js'
import { parseSfnt } from './pure/sfnt.js'

/**
 * Install the worker message handler.
 * @param {{ onmessage: (event: { data: unknown }) => void, postMessage: (value: unknown) => void }} scope - worker global.
 * @returns {void}
 */
export function fontWorker(scope) {
  scope.onmessage = async (event) => {
    const request = event.data
    if (typeof request !== 'object' || request === null || request.v !== 1
      || request.kind !== 'font-meta' || !(request.bytes instanceof Uint8Array)) {
      scope.postMessage({ v: 1, ok: false, code: 'invalid' })
      return
    }
    try {
      const value = await parseSfnt(request.bytes, request.limits ?? LIMITS)
      scope.postMessage({ v: 1, ok: true, value })
    } catch (error) {
      scope.postMessage({ v: 1, ok: false, code: error?.code === 'tooLarge' ? 'tooLarge' : 'invalid' })
    }
  }
}
