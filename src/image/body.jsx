/** Native image body for formats the built-in image renderer does not claim. */
import { useEffect, useState } from 'react'
import { fileNameOf, filePathOf } from '../runtime/path.js'
import { formatBytes } from '../runtime/format.js'
import { imageMediaTypeForPath, withinPixelLimit } from './image.js'

/**
 * Present an AVIF/TIFF/HEIC image through the browser's native decoder.
 * @param {object} props - document body props.
 * @returns {object} the image preview.
 */
export function ImageBody({ content, resourceAddress, t }) {
  const bytes = content.kind === 'bytes' ? content.data : undefined
  const path = filePathOf(resourceAddress) ?? ''
  const mediaType = imageMediaTypeForPath(path)
  const [url, setUrl] = useState(undefined)
  const [error, setError] = useState(undefined)
  const [size, setSize] = useState({})

  useEffect(() => {
    if (bytes === undefined || mediaType === undefined) {
      setUrl(undefined)
      return () => {}
    }
    let objectUrl
    try {
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: mediaType }))
    } catch {
      setError('image.decodeFailed')
      return () => {}
    }
    setUrl(objectUrl)
    setError(undefined)
    setSize({})
    return () => { URL.revokeObjectURL(objectUrl) }
  }, [bytes, mediaType])

  const failure = error ?? (bytes === undefined ? 'empty' : (mediaType === undefined ? 'unsupported' : undefined))
  if (failure !== undefined) {
    return (
      <div className="dshrp-root" data-resource-preview="image">
        <div className="dshrp-error" role="alert">
          <span className="dshrp-error-text">{t(failure)}</span>
          {failure === 'image.decodeFailed' && <span className="dshrp-muted">{t('viewerHint')}</span>}
        </div>
      </div>
    )
  }
  if (url === undefined) {
    return (
      <div className="dshrp-root" data-resource-preview="image">
        <div className="dshrp-status" role="status">
          <span className="dshrp-spinner" aria-hidden="true" />
          <span>{t('loading')}</span>
        </div>
      </div>
    )
  }
  return (
    <div className="dshrp-root" data-resource-preview="image">
      <div className="dshrp-media-meta">
        <span className="dshrp-chip">{mediaType}</span>
        <span className="dshrp-muted">{formatBytes(t, bytes.byteLength)}</span>
        {size.width > 0 && <span className="dshrp-muted">{t('image.dimensions', { width: size.width, height: size.height })}</span>}
      </div>
      <div className="dshrp-image-stage">
        <img
          src={url}
          alt={fileNameOf(path)}
          decoding="async"
          draggable={false}
          onLoad={(event) => {
            const width = event.currentTarget.naturalWidth
            const height = event.currentTarget.naturalHeight
            if (!withinPixelLimit(width, height)) {
              setError('image.tooLarge')
              setUrl(undefined)
              return
            }
            setSize({ width, height })
          }}
          onError={() => { setError('image.decodeFailed'); setUrl(undefined) }}
        />
      </div>
    </div>
  )
}
