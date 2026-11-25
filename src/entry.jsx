/**
 * Client entry for the resource URL compatibility bundle.
 *
 * The URL repair runs immediately, before any Client service is available.
 * Preview registrations live in a child scope that waits for the document
 * preview surfaces; a profile without them keeps the original behavior.
 */
import { createElement, useEffect, useState } from 'react'
import { applyUrlCompat } from './url-compat.js'
import { en, zh } from './locales.js'
import { createRuntime } from './runtime/runtime.js'
import { NS, registerPreviews } from './runtime/registration.js'
import { installStyles } from './runtime/style.js'

/** Loader require captured by the generated factory before Cordis calls apply. */
let loaderRequire

/**
 * Capture the Client module loader require. The build wrapper calls this once
 * when the package factory materializes; chunks load through it.
 * @param {{ async: (specifier: string) => Promise<unknown> }} require - loader require.
 * @returns {void}
 */
export function setRequire(require) {
  loaderRequire = require
}

/** Component export name for each package-local chunk. */
const BODY_EXPORTS = {
  'client.media.js': 'MediaBody',
  'client.image.js': 'ImageBody',
  'client.font.js': 'FontBody',
  'client.archive.js': 'ArchiveBody',
  'client.binary.js': 'BinaryBody',
}

/**
 * Build the stable lazy component for one family.
 * @param {{ id: string, chunk: string }} family - family metadata.
 * @param {object} runtime - pool/chunk/cache/limits face.
 * @returns {Function} a body component that loads its own chunk on mount.
 */
function lazyBody(family, runtime) {
  const fallbackT = key => key
  return function ResourceLazyBody(props) {
    const t = props.t ?? fallbackT
    const [attempt, setAttempt] = useState(0)
    const [state, setState] = useState({ kind: 'loading', Body: undefined })
    useEffect(() => {
      let active = true
      if (runtime === undefined) {
        setState({ kind: 'error' })
        return () => { active = false }
      }
      setState({ kind: 'loading', Body: undefined })
      runtime.chunks.load(family.chunk).then(
        (module) => {
          if (!active) return
          const Body = module?.[BODY_EXPORTS[family.chunk]]
          if (typeof Body !== 'function') {
            setState({ kind: 'error' })
            return
          }
          setState({ kind: 'ready', Body })
        },
        () => { if (active) setState({ kind: 'error' }) },
      )
      return () => { active = false }
    }, [attempt, runtime, family])
    if (state.kind === 'ready') {
      return createElement(state.Body, { ...props, runtime })
    }
    if (state.kind === 'error') {
      return (
        <div className="dshrp-root" data-resource-preview="chunk-error">
          <div className="dshrp-error" role="alert">
            <span className="dshrp-error-text">{t('chunkFailed')}</span>
            <button
              type="button"
              className="dshrp-button"
              data-resource-preview-retry
              onClick={() => {
                runtime?.chunks.clear(family.chunk)
                setAttempt(value => value + 1)
              }}
            >
              {t('retry')}
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="dshrp-root" data-resource-preview="loading">
        <div className="dshrp-status" role="status">
          <span className="dshrp-spinner" aria-hidden="true" />
          <span>{t('loading')}</span>
        </div>
      </div>
    )
  }
}

/**
 * Activate the URL repair and register the preview families once their services exist.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Client plugin context.
 * @returns {void}
 */
export function apply(ctx) {
  applyUrlCompat(ctx)
  ctx.inject(['documentPreviews', 'slots', 'locale'], (scope) => {
    const t = scope.locale.bind(NS)
    const runtime = createRuntime(loaderRequire)
    scope.effect(() => () => runtime.dispose(), 'resource-preview: runtime')
    scope.effect(() => scope.locale.register(NS, { zh, en }), 'resource-preview: dictionaries')
    scope.effect(() => installStyles(), 'resource-preview: styles')
    registerPreviews(scope, family => lazyBody(family, runtime), t, runtime)
  })
}

/** No required services: the URL repair must work even without the preview package. */
export const inject = []
