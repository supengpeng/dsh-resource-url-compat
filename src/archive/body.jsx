/** Archive entry list and one selected text/image preview. */
import { useEffect, useState } from 'react'
import { formatBytes } from '../runtime/format.js'
import { filePathOf } from '../runtime/path.js'
import { validateWorkerResult } from '../runtime/validate.js'
import { archiveFormatOf } from './format.js'

const PAGE_SIZE = 200

/**
 * Present one archive without storing decompressed bytes or file names as markup.
 * @param {object} props - document body props plus runtime.
 * @returns {object} the archive preview.
 */
export function ArchiveBody({ content, resourceAddress, runtime, useTabInfo, scrollportRef, t }) {
  const bytes = content.kind === 'bytes' ? content.data : undefined
  const path = filePathOf(resourceAddress) ?? ''
  const format = archiveFormatOf(path)
  const { tab } = useTabInfo()
  const [state, setState] = useState({ kind: bytes === undefined ? 'empty' : 'loading' })
  const [entry, setEntry] = useState({ kind: 'idle' })
  const [selected, setSelected] = useState(undefined)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (bytes === undefined) { setState({ kind: 'empty' }); return () => {} }
    if (format === undefined) { setState({ kind: 'error', code: 'unsupported' }); return () => {} }
    if (runtime === undefined || runtime.workerAvailable === false) {
      setState({ kind: 'error', code: 'unsupported' })
      return () => {}
    }
    const cached = runtime.cache.get(bytes, 'archive-list')
    if (cached !== undefined) { setState({ kind: 'ready', list: cached }); return () => {} }
    const controller = new AbortController()
    const abort = () => { controller.abort() }
    tab.signal.addEventListener('abort', abort, { once: true })
    let active = true
    setState({ kind: 'loading' })
    runtime.pool.run({
      source: ARCHIVE_WORKER_SOURCE,
      payload: { kind: 'archive-list', format, bytes, limits: runtime.limits },
      timeoutMs: 8000,
      signal: controller.signal,
      validate: value => validateWorkerResult('archive-list', value),
    }).then((list) => {
      if (!active) return
      runtime.cache.set(bytes, 'archive-list', list)
      setState({ kind: 'ready', list })
      setSelected(undefined)
      setPage(0)
    }, (error) => {
      if (active) setState({ kind: 'error', code: error?.code ?? 'invalid' })
    })
    return () => {
      active = false
      controller.abort()
      tab.signal.removeEventListener('abort', abort)
    }
  }, [bytes, format, runtime, tab.signal])

  useEffect(() => {
    if (state.kind !== 'ready' || selected === undefined) { setEntry({ kind: 'idle' }); return () => {} }
    const candidate = state.list.entries[selected]
    if (candidate === undefined) { setEntry({ kind: 'idle' }); return () => {} }
    if (candidate.directory) { setEntry({ kind: 'unsupported', reason: 'directory' }); return () => {} }
    if (candidate.encrypted) { setEntry({ kind: 'error', code: 'encrypted' }); return () => {} }
    if (candidate.unsafe) { setEntry({ kind: 'unsupported', reason: 'unsafePath' }); return () => {} }
    if (candidate.bomb) { setEntry({ kind: 'error', code: 'bomb' }); return () => {} }
    if (runtime === undefined) { setEntry({ kind: 'error', code: 'unsupported' }); return () => {} }
    const key = `archive-entry:${selected}`
    const cached = runtime.cache.get(bytes, key)
    if (cached !== undefined) { setEntry({ kind: 'ready', value: cached }); return () => {} }
    const controller = new AbortController()
    const abort = () => { controller.abort() }
    tab.signal.addEventListener('abort', abort, { once: true })
    let active = true
    setEntry({ kind: 'loading' })
    runtime.pool.run({
      source: ARCHIVE_WORKER_SOURCE,
      payload: { kind: 'archive-entry', format, bytes, index: selected, limits: runtime.limits },
      timeoutMs: 8000,
      signal: controller.signal,
      validate: value => validateWorkerResult('archive-entry', value),
    }).then((value) => {
      if (!active) return
      runtime.cache.set(bytes, key, value)
      setEntry({ kind: 'ready', value })
    }, (error) => {
      if (active) setEntry({ kind: 'error', code: error?.code ?? 'invalid' })
    })
    return () => {
      active = false
      controller.abort()
      tab.signal.removeEventListener('abort', abort)
    }
  }, [state, selected, bytes, format, runtime, tab.signal])

  if (state.kind === 'empty') {
    return <div className="dshrp-root" data-resource-preview="archive"><div className="dshrp-status">{t('empty')}</div></div>
  }
  if (state.kind === 'loading') {
    return (
      <div className="dshrp-root" data-resource-preview="archive">
        <div className="dshrp-status" role="status"><span className="dshrp-spinner" aria-hidden="true" /><span>{t('loading')}</span></div>
      </div>
    )
  }
  if (state.kind === 'error') {
    return (
      <div className="dshrp-root" data-resource-preview="archive">
        <div className="dshrp-error" role="alert"><span className="dshrp-error-text">{t(state.code)}</span></div>
      </div>
    )
  }
  const entries = state.list.entries
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const visible = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const uncompressed = entries.reduce((total, item) => total + item.bytes, 0)
  const compressed = entries.reduce((total, item) => total + item.compressedBytes, 0)
  return (
    <div className="dshrp-root" data-resource-preview="archive">
      <div className="dshrp-archive-summary">
        <span className="dshrp-chip">{format}</span>
        <span className="dshrp-muted">{t('archive.entries', { count: entries.length })}</span>
        <span className="dshrp-muted">{t('archive.uncompressed')}: {formatBytes(t, uncompressed)}</span>
        <span className="dshrp-muted">{t('archive.compressed')}: {formatBytes(t, compressed)}</span>
        {state.list.truncated && <span className="dshrp-muted">{t('truncated')}</span>}
      </div>
      <div className="dshrp-archive-body">
        <div className="dshrp-archive-list" ref={scrollportRef} data-archive-list>
          {entries.length === 0 && <div className="dshrp-status">{t('archive.empty')}</div>}
          {visible.map(item => {
            const index = item.index
            const label = item.unsafe ? `${t('archive.unsafe')}: ${item.path}` : item.path
            return (
              <button
                key={`${item.path}-${index}`}
                type="button"
                className="dshrp-archive-row"
                aria-selected={selected === index}
                data-archive-entry={index}
                onClick={() => setSelected(index)}
              >
                <span className="dshrp-archive-name">{label}</span>
                <span className="dshrp-archive-size">{formatBytes(t, item.bytes)}</span>
                <span className="dshrp-archive-flags">
                  {item.directory && <span className="dshrp-chip">{t('archive.directory')}</span>}
                  {item.encrypted && <span className="dshrp-chip">{t('archive.encrypted')}</span>}
                  {item.bomb && <span className="dshrp-chip">{t('archive.bomb')}</span>}
                  {item.unsafe && <span className="dshrp-chip">{t('archive.unsafe')}</span>}
                </span>
              </button>
            )
          })}
          {pages > 1 && (
            <div className="dshrp-pager">
              <button type="button" className="dshrp-button" aria-label={t('archive.prev')} disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))}>←</button>
              <span className="dshrp-muted">{t('archive.page', { page: page + 1, pages })}</span>
              <button type="button" className="dshrp-button" aria-label={t('archive.next')} disabled={page + 1 >= pages} onClick={() => setPage(value => Math.min(pages - 1, value + 1))}>→</button>
            </div>
          )}
        </div>
        <div className="dshrp-archive-detail">
          {entry.kind === 'idle' && <div className="dshrp-muted">{t('archive.selectEntry')}</div>}
          {entry.kind === 'loading' && <div className="dshrp-status" role="status"><span className="dshrp-spinner" aria-hidden="true" /><span>{t('loading')}</span></div>}
          {entry.kind === 'error' && <div className="dshrp-error" role="alert"><span className="dshrp-error-text">{t(entry.code)}</span></div>}
          {entry.kind === 'unsupported' && <div className="dshrp-muted">{t(entry.reason === 'unsafePath' ? 'archive.unsafe' : 'archive.unsupportedEntry')}</div>}
          {entry.kind === 'ready' && entry.value.kind === 'text' && <pre className="dshrp-archive-text">{entry.value.text}</pre>}
          {entry.kind === 'ready' && entry.value.kind === 'image' && <ArchiveImage value={entry.value} alt={entries[selected]?.path ?? ''} t={t} />}
          {entry.kind === 'ready' && entry.value.kind === 'unsupported' && <div className="dshrp-muted">{t('archive.unsupportedEntry')}</div>}
        </div>
      </div>
    </div>
  )
}

/**
 * Render one extracted image entry with a scoped object URL.
 * @param {{ value: object, alt: string, t: Function }} props - preview value and copy.
 * @returns {object} image or loading state.
 */
function ArchiveImage({ value, alt, t }) {
  const [url, setUrl] = useState(undefined)
  useEffect(() => {
    let objectUrl
    try {
      objectUrl = URL.createObjectURL(new Blob([value.bytes], { type: value.mediaType }))
    } catch {
      return () => {}
    }
    setUrl(objectUrl)
    return () => { URL.revokeObjectURL(objectUrl) }
  }, [value.bytes, value.mediaType])
  if (url === undefined) return <div className="dshrp-status"><span className="dshrp-spinner" aria-hidden="true" /><span>{t('loading')}</span></div>
  return <img className="dshrp-archive-image" src={url} alt={alt} decoding="async" draggable={false} />
}

/** Worker source injected by the build script. */
const ARCHIVE_WORKER_SOURCE = __ARCHIVE_WORKER_SOURCE__
