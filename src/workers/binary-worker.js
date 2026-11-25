/** Disposable read-only binary scanner. */
import { LIMITS } from '../runtime/limits.js'
import { scanBinary } from './pure/magic.js'

/**
 * Install the binary worker handler.
 * @param {{ onmessage: (event: { data: unknown }) => void, postMessage: (value: unknown) => void }} scope - worker global.
 * @returns {void}
 */
export function binaryWorker(scope) {
  scope.onmessage = (event) => {
    const request = event.data
    if (typeof request !== 'object' || request === null || request.v !== 1
      || request.kind !== 'binary-scan' || !(request.bytes instanceof Uint8Array)) {
      scope.postMessage({ v: 1, ok: false, code: 'invalid' })
      return
    }
    try {
      const value = scanBinary(request.bytes, request.limits ?? LIMITS)
      scope.postMessage({ v: 1, ok: true, value })
    } catch {
      scope.postMessage({ v: 1, ok: false, code: 'invalid' })
    }
  }
}
