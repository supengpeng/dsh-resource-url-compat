/** Display-safe archive entry paths; archives are never written to the filesystem. */

const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/gu
const BIDI = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu

/**
 * Normalize one archive entry path for display and mark unsafe shapes.
 * @param {string} raw - archive-provided path.
 * @param {{ maxPathChars: number }} limits - display limits.
 * @returns {{ display: string, unsafe: boolean }} the cleaned path and safety mark.
 */
export function safeArchivePath(raw, limits) {
  const original = typeof raw === 'string' ? raw : ''
  let display = original.replaceAll('\\', '/').replace(CONTROLS, '').replace(BIDI, '')
  let unsafe = original !== display
  if (/^[A-Za-z]:/u.test(display) || display.startsWith('/')) unsafe = true
  if (display.split('/').includes('..')) unsafe = true
  if (display.length > limits.maxPathChars) display = display.slice(0, limits.maxPathChars)
  return { display, unsafe }
}
