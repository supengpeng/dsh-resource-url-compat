/** Native audio/video body; the browser owns decoding and controls. */
import { useEffect, useState } from 'react'
import { filePathOf } from '../runtime/path.js'
import { formatBytes, formatClock } from '../runtime/format.js'
import { mediaErrorKey, mediaUrlFor } from './media.js'

/**
 * Present complete bytes through the native media element.
 * @param {object} props - document body props.
 * @returns {object} the media preview.
 */
export function MediaBody({ content, resourceAddress, t }) {
  const bytes = content.kind === 'bytes' ? content.data : undefined
  const path = filePathOf(resourceAddress) ?? ''
  const info = bytes === undefined ? undefined : mediaUrlFor(bytes, path)
  const [url, setUrl] = useState(undefined)
  const [error, setError] = useState(undefined)
  const [meta, setMeta] = useState({})

  useEffect(() => {
    if (bytes === undefined || info === undefined) {
      setUrl(undefined)
      return () => {}
    }
    let objectUrl
    try {
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: info.mediaType }))
    } catch {
      setError('decodeFailed')
      return () => {}
    }
    setUrl(objectUrl)
    setError(undefined)
    setMeta({})
    return () => { URL.revokeObjectURL(objectUrl) }
  }, [bytes, info?.kind, info?.mediaType])

  const failure = error ?? (bytes === undefined ? 'empty' : (info === undefined ? 'decodeFailed' : undefined))
  if (failure !== undefined) {
    return (
      <div className="dshrp-root" data-resource-preview="media">
        <div className="dshrp-error" role="alert">
          <span className="dshrp-error-text">{t(failure)}</span>
          {failure === 'decodeFailed' && <span className="dshrp-muted">{t('viewerHint')}</span>}
        </div>
      </div>
    )
  }
  if (url === undefined) {
    return (
      <div className="dshrp-root" data-resource-preview="media">
        <div className="dshrp-status" role="status">
          <span className="dshrp-spinner" aria-hidden="true" />
          <span>{t('loading')}</span>
        </div>
      </div>
    )
  }
  const audio = info.kind === 'audio'
  const metadata = (
    <div className="dshrp-media-meta">
      <span className="dshrp-chip">{t(audio ? 'media.audio' : 'media.video')}</span>
      <span className="dshrp-muted">{formatBytes(t, bytes.byteLength)}</span>
      {Number.isFinite(meta.duration) && <span className="dshrp-muted">{formatClock(meta.duration)}</span>}
      {meta.width > 0 && meta.height > 0 && <span className="dshrp-muted">{t('media.resolution', { width: meta.width, height: meta.height })}</span>}
    </div>
  )
  const onMetadata = event => {
    const element = event.currentTarget
    setMeta({
      duration: element.duration,
      width: element.videoWidth ?? 0,
      height: element.videoHeight ?? 0,
    })
  }
  const onError = event => { setError(mediaErrorKey(event.currentTarget.error?.code)) }
  return (
    <div className="dshrp-root" data-resource-preview="media" data-media-kind={info.kind}>
      {metadata}
      <div className="dshrp-media-stage">
        {audio
          ? <audio controls preload="metadata" src={url} aria-label={t('media.audio')} onLoadedMetadata={onMetadata} onError={onError} />
          : <video controls preload="metadata" playsInline src={url} aria-label={t('media.video')} onLoadedMetadata={onMetadata} onError={onError} />}
      </div>
    </div>
  )
}
