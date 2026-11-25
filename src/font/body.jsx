/** Font specimen plus Worker-owned sfnt metadata. */
import { useEffect, useState } from 'react'
import { formatBytes } from '../runtime/format.js'
import { validateWorkerResult } from '../runtime/validate.js'
import { filePathOf } from '../runtime/path.js'

/** Generated family names never include file-controlled text. */
let familySequence = 0

/**
 * Present one font's metadata and browser-rendered specimen.
 * @param {object} props - document body props plus the preview runtime.
 * @returns {object} the font preview.
 */
export function FontBody({ content, resourceAddress, runtime, useTabInfo, scrollportRef, t }) {
  const bytes = content.kind === 'bytes' ? content.data : undefined
  const { tab } = useTabInfo()
  const path = filePathOf(resourceAddress) ?? ''
  const [state, setState] = useState({ kind: bytes === undefined ? 'empty' : 'loading' })
  const [face, setFace] = useState({ kind: 'idle' })

  useEffect(() => {
    if (bytes === undefined) { setState({ kind: 'empty' }); return () => {} }
    const cached = runtime?.cache.get(bytes, 'font-meta')
    if (cached !== undefined) { setState({ kind: 'ready', metadata: cached }); return () => {} }
    if (runtime === undefined || runtime.workerAvailable === false) {
      setState({ kind: 'error', code: 'unsupported' })
      return () => {}
    }
    const controller = new AbortController()
    const abort = () => { controller.abort() }
    tab.signal.addEventListener('abort', abort, { once: true })
    let active = true
    setState({ kind: 'loading' })
    runtime.pool.run({
      source: FONT_WORKER_SOURCE,
      payload: { kind: 'font-meta', bytes, limits: runtime.limits },
      timeoutMs: 8000,
      signal: controller.signal,
      validate: value => validateWorkerResult('font-meta', value),
    }).then((metadata) => {
      if (!active) return
      runtime.cache.set(bytes, 'font-meta', metadata)
      setState({ kind: 'ready', metadata })
    }, (error) => {
      if (active) setState({ kind: 'error', code: error?.code ?? 'invalid' })
    })
    return () => {
      active = false
      controller.abort()
      tab.signal.removeEventListener('abort', abort)
    }
  }, [bytes, runtime, tab.signal])

  useEffect(() => {
    if (state.kind !== 'ready' || bytes === undefined) return () => {}
    if (typeof FontFace !== 'function' || typeof document === 'undefined' || document.fonts === undefined) {
      setFace({ kind: 'unsupported' })
      return () => {}
    }
    let active = true
    let url
    let loaded
    const family = `dsh-resource-font-${++familySequence}`
    try {
      url = URL.createObjectURL(new Blob([bytes], { type: 'font/ttf' }))
    } catch {
      setFace({ kind: 'failed' })
      return () => {}
    }
    let faceObject
    try {
      faceObject = new FontFace(family, `url(${url})`)
    } catch {
      URL.revokeObjectURL(url)
      setFace({ kind: 'failed' })
      return () => {}
    }
    faceObject.load().then((value) => {
      if (!active) {
        document.fonts.delete(value)
        URL.revokeObjectURL(url)
        return
      }
      loaded = value
      document.fonts.add(value)
      setFace({ kind: 'ready', face: value })
    }, () => {
      if (active) setFace({ kind: 'failed' })
    })
    return () => {
      active = false
      if (loaded !== undefined) document.fonts.delete(loaded)
      URL.revokeObjectURL(url)
    }
  }, [state.kind, bytes])

  if (state.kind === 'empty') {
    return <div className="dshrp-root" data-resource-preview="font"><div className="dshrp-status">{t('empty')}</div></div>
  }
  if (state.kind === 'loading') {
    return (
      <div className="dshrp-root" data-resource-preview="font">
        <div className="dshrp-status" role="status"><span className="dshrp-spinner" aria-hidden="true" /><span>{t('loading')}</span></div>
      </div>
    )
  }
  if (state.kind === 'error') {
    return (
      <div className="dshrp-root" data-resource-preview="font">
        <div className="dshrp-error" role="alert"><span className="dshrp-error-text">{t(state.code)}</span></div>
      </div>
    )
  }
  const metadata = state.metadata
  const rows = [
    ['font.family', metadata.family],
    ['font.subfamily', metadata.subfamily],
    ['font.fullName', metadata.fullName],
    ['font.version', metadata.version],
    ['font.unitsPerEm', metadata.unitsPerEm],
    ['font.ascender', metadata.ascender],
    ['font.descender', metadata.descender],
    ['font.weight', metadata.weight],
    ['font.glyphs', metadata.glyphs],
  ].filter(([, value]) => value !== undefined)
  return (
    <div className="dshrp-root" data-resource-preview="font">
      <div className="dshrp-panel" ref={scrollportRef}>
        <div className="dshrp-media-meta">
          <span className="dshrp-chip">{metadata.format}</span>
          <span className="dshrp-muted">{formatBytes(t, bytes.byteLength)}</span>
          {path !== '' && <span className="dshrp-muted">{path}</span>}
        </div>
        {rows.length > 0 && (
          <dl className="dshrp-font-meta">
            {rows.map(([key, value]) => (
              <div key={key} className="dshrp-font-row">
                <dt className="dshrp-muted">{t(key)}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {metadata.axes !== undefined && metadata.axes.length > 0 && (
          <div className="dshrp-font-block">
            <span className="dshrp-muted">{t('font.axes')}</span>
            <div className="dshrp-chips">{metadata.axes.map(axis => <span key={axis} className="dshrp-chip">{axis}</span>)}</div>
          </div>
        )}
        {metadata.tables.length > 0 && (
          <div className="dshrp-font-block">
            <span className="dshrp-muted">{t('font.tables')}</span>
            <div className="dshrp-chips">{metadata.tables.map(tag => <span key={tag} className="dshrp-chip">{tag}</span>)}</div>
          </div>
        )}
        <div className="dshrp-font-specimen" data-font-face={face.kind}>
          {face.kind === 'ready' && <div style={{ fontFamily: face.face.family }}>{t('font.sample')}</div>}
          {face.kind === 'ready' && <div className="dshrp-font-small" style={{ fontFamily: face.face.family }}>{t('font.sample')}</div>}
          {face.kind === 'ready' && <div className="dshrp-font-large" style={{ fontFamily: face.face.family }}>{t('font.sample')}</div>}
          {face.kind !== 'ready' && <div className="dshrp-muted">{t(face.kind === 'failed' ? 'font.loadFailed' : 'font.compressed')}</div>}
        </div>
      </div>
    </div>
  )
}

/** Worker source injected by the build script. */
const FONT_WORKER_SOURCE = __FONT_WORKER_SOURCE__
