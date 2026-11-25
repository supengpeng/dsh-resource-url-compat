/** Map an archive filename to the parser format. */
import { fileNameOf } from '../runtime/path.js'

/**
 * Resolve the archive format from a decoded filename.
 * @param {string} path - file path.
 * @returns {'zip' | 'tar' | 'tgz' | 'gz' | undefined} parser format.
 */
export function archiveFormatOf(path) {
  const name = fileNameOf(path).toLowerCase()
  if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) return 'tgz'
  if (name.endsWith('.gz')) return 'gz'
  if (name.endsWith('.tar')) return 'tar'
  if (name.endsWith('.zip') || name.endsWith('.jar')) return 'zip'
  return undefined
}
