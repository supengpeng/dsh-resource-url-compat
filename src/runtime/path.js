/** File-address and display-path helpers used by every preview body. */

const FILE_PREFIX = 'dsh-resource://file/'

/**
 * Read a file address into its path without resolving `.` or `..`.
 * @param {string} address - a `dsh-resource://file/` address.
 * @returns {string | undefined} the decoded path, or undefined for a foreign or malformed address.
 */
export function filePathOf(address) {
  if (typeof address !== 'string' || !address.startsWith(FILE_PREFIX)) return undefined
  const end = address.search(/[?#]/)
  const body = address.slice(FILE_PREFIX.length, end === -1 ? undefined : end)
  const parts = body.split('/')
  const scope = parts[0]
  try {
    if (scope === 'session') {
      const id = parts[1]
      const segments = parts.slice(2)
      if (id === undefined || id === '' || segments.length === 0) return undefined
      return segments.map(segment => decodeURIComponent(segment)).join('/')
    }
    if (scope === 'absolute') {
      const rest = parts.slice(1)
      const unc = rest[0] === '' && rest.length > 1
      const segments = unc ? rest.slice(1) : rest
      if (segments.length === 0 || segments[0] === '') return undefined
      return unc ? `//${segments.map(decodeURIComponent).join('/')}` : segments.map(decodeURIComponent).join('/')
    }
  } catch {
    // A malformed percent escape names no file.
    return undefined
  }
  return undefined
}

/**
 * Read the final path segment.
 * @param {string} path - a `/`- or `\\`-separated path.
 * @returns {string} the last non-empty segment, or the original path when it has none.
 */
export function fileNameOf(path) {
  const trimmed = path.replace(/[/\\]+$/, '')
  if (trimmed === '') return path
  return trimmed.slice(Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\')) + 1)
}

/**
 * Read the lowercased final suffix of a path.
 * @param {string} path - a `/`- or `\\`-separated path.
 * @returns {string} the suffix without its dot, or an empty string.
 */
export function suffixOf(path) {
  const name = fileNameOf(path).toLowerCase()
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1)
}
