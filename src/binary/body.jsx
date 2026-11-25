/** Read-only binary summary, strings, and bounded hex pages. */
import { useEffect, useState } from 'react'
import { formatBytes } from '../runtime/format.js'
import { filePathOf } from '../runtime/path.js'
import { validateWorkerResult } from '../runtime/validate.js'
import { hexPage } from '../workers/pure/hex.js'

const PAGE_BYTES = 8 * 1024

/**
 * Present a binary file's structure and a bounded page window.
 * @param {object} props - document body props plus runtime.
 * @returns {object} the binary preview.
 */
export function BinaryBody({ content, resourceAddress, runtime, useTabInfo, scrollportRef, t }) {
  const bytes = content.kind === 'bytes' ? content.data : undefined
  const path = filePathOf(resourceAddress) ?? ''
  const { tab } = useTabInfo()
  const [state, setState] = useState({ kind: bytes === undefined ? 'empty' : 'loading' })
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (bytes === undefined) { setState({ kind: 'empty' }); return () => {} }
    if (runtime === undefined || runtime.workerAvailable === false) {
      setState({ kind: 'error', code: 'unsupported' })
      return () => {}
    }
    const cached = runtime.cache.get(bytes, 'binary-scan')
    if (cached !== undefined) { setState({ kind: 'ready', scan: cached }); return () => {} }
    const controller = new AbortController()
    const abort = () => { controller.abort() }
    tab.signal.addEventListener('abort', abort, { once: true })
    let active = true
    setState({ kind: 'loading' })
    runtime.pool.run({
      source: BINARY_WORKER_SOURCE,
      payload: { kind: 'binary-scan', bytes, limits: runtime.limits },
      timeoutMs: 8000,
      signal: controller.signal,
      validate: value => validateWorkerResult('binary-scan', value),
    }).then((scan) => {
      if (!active) return
      runtime.cache.set(bytes, 'binary-scan', scan)
      setState({ kind: 'ready', scan })
      setPage(0)
    }, (error) => {
      if (active) setState({ kind: 'error', code: error?.code ?? 'invalid' })
    })
    return () => {
      active = false
      controller.abort()
      tab.signal.removeEventListener('abort', abort)
    }
  }, [bytes, runtime, tab.signal])

  if (state.kind === 'empty') {
    return <div className="dshrp-root" data-resource-preview="binary"><div className="dshrp-status">{t('empty')}</div></div>
  }
  if (state.kind === 'loading') {
    return (
      <div className="dshrp-root" data-resource-preview="binary">
        <div className="dshrp-status" role="status"><span className="dshrp-spinner" aria-hidden="true" /><span>{t('loading')}</span></div>
      </div>
    )
  }
  if (state.kind === 'error') {
    return (
      <div className="dshrp-root" data-resource-preview="binary">
        <div className="dshrp-error" role="alert"><span className="dshrp-error-text">{t(state.code)}</span></div>
      </div>
    )
  }
  const scan = state.scan
  const inspectable = Math.min(bytes.length, runtime.limits.maxBinaryScanBytes)
  const pages = Math.max(1, Math.ceil(inspectable / PAGE_BYTES))
  const visiblePage = Math.min(page, pages - 1)
  const pageData = hexPage(bytes, visiblePage * PAGE_BYTES, PAGE_BYTES)
  return (
    <div className="dshrp-root" data-resource-preview="binary">
      <div className="dshrp-binary-summary">
        <span className="dshrp-chip">{scan.format}</span>
        <span className="dshrp-muted">{formatBytes(t, bytes.byteLength)}</span>
        <span className="dshrp-muted">{t('binary.hex')}</span>
        {scan.truncated && <span className="dshrp-muted">{t('binary.truncated')}</span>}
        {path !== '' && <span className="dshrp-muted">{path}</span>}
      </div>
      {scan.summary.length > 0 && (
        <div className="dshrp-binary-summary">
          {scan.summary.map(token => <span key={token} className="dshrp-chip dshrp-mono">{token}</span>)}
        </div>
      )}
      <div className="dshrp-binary-body">
        <div className="dshrp-binary-strings">
          <div className="dshrp-muted">{t('binary.strings')}</div>
          {scan.strings.length === 0
            ? <div className="dshrp-muted">{t('binary.noStrings')}</div>
            : <ul>{scan.strings.map((line, index) => <li key={`${index}-${line}`} className="dshrp-mono">{line}</li>)}</ul>}
        </div>
        <div className="dshrp-binary-hex" ref={scrollportRef}>
          {pageData.rows.map(row => (
            <div key={row.offset} className="dshrp-hex-row">
              <span className="dshrp-hex-offset">{row.offset.toString(16).padStart(8, '0')}</span>
              <span className="dshrp-hex-bytes">{row.hex}</span>
              <span className="dshrp-hex-ascii">{row.ascii}</span>
            </div>
          ))}
          {pages > 1 && (
            <div className="dshrp-pager">
              <button type="button" className="dshrp-button" aria-label={t('binary.prev')} disabled={visiblePage === 0} onClick={() => setPage(value => Math.max(0, value - 1))}>←</button>
              <span className="dshrp-muted">{t('binary.page', { page: visiblePage + 1, pages })}</span>
              <button type="button" className="dshrp-button" aria-label={t('binary.next')} disabled={visiblePage + 1 >= pages} onClick={() => setPage(value => Math.min(pages - 1, value + 1))}>→</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Worker source injected by the build script. */
const BINARY_WORKER_SOURCE = __BINARY_WORKER_SOURCE__
