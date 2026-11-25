/** Human-readable values for preview metadata. */

const round = value => String(Number(value.toFixed(1)))

/**
 * Format a byte count through locale unit keys.
 * @param {(key: string, params?: object) => string} t - bound translator.
 * @param {number} bytes - byte count.
 * @returns {string} localized size text.
 */
export function formatBytes(t, bytes) {
  const value = Number.isFinite(bytes) && bytes >= 0 ? bytes : 0
  if (value < 1024) return t('size.bytes', { value })
  if (value < 1024 * 1024) return t('size.kib', { value: round(value / 1024) })
  if (value < 1024 * 1024 * 1024) return t('size.mib', { value: round(value / (1024 * 1024)) })
  return t('size.gib', { value: round(value / (1024 * 1024 * 1024)) })
}

/**
 * Format a duration as minutes and seconds.
 * @param {number} seconds - duration in seconds.
 * @returns {string} `m:ss` or `h:mm:ss`.
 */
export function formatClock(seconds) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}
