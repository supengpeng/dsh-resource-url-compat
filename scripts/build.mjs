/**
 * Build the bundle's browser artifacts with the repository's Vite installation.
 *
 * Each output is a lazy CommonJS factory wrapped in the Client module loader's
 * registration call. Chunk outputs are registered with `chunk:` so the module
 * system can serve them from `client.<family>.js`; the entry stays free of
 * static chunk requires and owns the build stamp that changes when only a
 * chunk changes.
 */
import { createHash } from 'node:crypto'
import { chmodSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE = 'dsh-resource-url-compat'
const PACKAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY_LIMIT = 48 * 1024
const CHUNK_LIMIT = 96 * 1024
const EXTERNALS = [
  'react', 'react/jsx-runtime', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives',
]

/** Tokens that would execute or interpret file content, or reach the network. */
const FORBIDDEN = [
  'dangerouslySetInnerHTML', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write',
  'eval(', 'new Function', 'importScripts', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource',
]

/**
 * Build one browser entry and return its CommonJS output.
 * @param {string} source - entry file relative to the package.
 * @returns {Promise<string>} the generated CJS code.
 */
async function buildEntry(source, define = undefined) {
  let vite
  try {
    vite = await import('vite')
  } catch (error) {
    throw new Error(`resource-preview: Vite is unavailable; run from the repository checkout with its existing node_modules (${String(error)})`)
  }
  const output = await vite.build({
    configFile: false,
    root: PACKAGE_DIR,
    publicDir: false,
    logLevel: 'silent',
    esbuild: { jsx: 'automatic' },
    ...(define === undefined ? {} : { define }),
    build: {
      outDir: PACKAGE_DIR,
      emptyOutDir: false,
      write: false,
      minify: true,
      target: 'chrome100',
      lib: {
        entry: join(PACKAGE_DIR, source),
        formats: ['cjs'],
        fileName: () => 'browser-entry',
      },
      rollupOptions: { external: EXTERNALS },
    },
  })
  const result = Array.isArray(output) ? output[0] : output
  const chunk = result.output.find(item => item.type === 'chunk')
  if (chunk === undefined) throw new Error(`resource-preview: ${source} produced no JavaScript chunk`)
  return chunk.code
}

/**
 * Wrap CommonJS output in the loader's lazy factory.
 * @param {string} code - CommonJS output.
 * @param {{ chunk?: string }} options - chunk file name when this is a chunk.
 * @returns {string} the loader registration.
 */
function wrap(code, options = {}) {
  const chunk = options.chunk === undefined ? '' : `chunk: ${JSON.stringify(options.chunk)},\n  `
  return `window.__ModuleLoader__.load({\n  id: ${JSON.stringify(PACKAGE)},\n  ${chunk}factory(require) {\n  const module = { exports: {} }\n  const exports = module.exports\n${code}\n  if (typeof module.exports.setRequire === "function") module.exports.setRequire(require)\n  return module.exports\n  },\n})\n`
}

/**
 * Fail when a generated artifact contains a forbidden API.
 * @param {string} fileName - artifact name for the diagnostic.
 * @param {string} code - generated JavaScript.
 * @returns {void}
 */
function checkForbidden(fileName, code) {
  for (const token of FORBIDDEN) {
    if (code.includes(token)) throw new Error(`resource-preview: ${fileName} contains forbidden API ${JSON.stringify(token)}`)
  }
}

/**
 * Check the artifact size budget.
 * @param {string} fileName - artifact name for the diagnostic.
 * @param {string} code - generated JavaScript.
 * @param {number} limit - maximum byte length.
 * @returns {void}
 */
function checkSize(fileName, code, limit) {
  const bytes = Buffer.byteLength(code, 'utf8')
  if (bytes > limit) throw new Error(`resource-preview: ${fileName} is ${bytes} bytes, over the ${limit}-byte budget`)
}

/**
 * Build one self-contained Worker entry and return its IIFE text.
 * @param {string} source - worker entry relative to the package.
 * @returns {Promise<string>} worker source text.
 */
async function buildWorker(source) {
  const vite = await import('vite')
  const output = await vite.build({
    configFile: false,
    root: PACKAGE_DIR,
    publicDir: false,
    logLevel: 'silent',
    build: {
      outDir: PACKAGE_DIR,
      emptyOutDir: false,
      write: false,
      minify: true,
      target: 'chrome100',
      rollupOptions: {
        input: join(PACKAGE_DIR, source),
        output: { format: 'iife', name: 'ResourcePreviewWorker', entryFileNames: 'worker.js' },
      },
    },
  })
  const result = Array.isArray(output) ? output[0] : output
  const chunk = result.output.find(item => item.type === 'chunk')
  if (chunk === undefined) throw new Error(`resource-preview: ${source} produced no worker chunk`)
  return chunk.code
}

/**
 * Build every browser artifact and stamp the entry with the chunk digest.
 * @returns {Promise<{ files: string[] }>} written artifact names.
 */
export async function buildAll() {
  const fontWorker = await buildWorker('src/workers/font-entry.js')
  const archiveWorker = await buildWorker('src/workers/archive-entry.js')
  const binaryWorker = await buildWorker('src/workers/binary-entry.js')
  const chunks = [
    ['client.media.js', 'src/media/entry.jsx', undefined],
    ['client.image.js', 'src/image/entry.jsx', undefined],
    ['client.font.js', 'src/font/entry.jsx', { __FONT_WORKER_SOURCE__: JSON.stringify(fontWorker) }],
    ['client.archive.js', 'src/archive/entry.jsx', { __ARCHIVE_WORKER_SOURCE__: JSON.stringify(archiveWorker) }],
    ['client.binary.js', 'src/binary/entry.jsx', { __BINARY_WORKER_SOURCE__: JSON.stringify(binaryWorker) }],
  ]
  let allChunks = ''
  for (const [file, source, define] of chunks) {
    const chunkCode = await buildEntry(source, define)
    const chunk = wrap(chunkCode, { chunk: file })
    checkForbidden(file, chunk)
    checkSize(file, chunk, CHUNK_LIMIT)
    const chunkPath = join(PACKAGE_DIR, file)
    writeFileSync(chunkPath, `${chunk.trimEnd()}\n`)
    chmodSync(chunkPath, 0o644)
    allChunks += chunk
  }

  const digest = createHash('sha1').update(allChunks).digest('hex')
  const entryCode = await buildEntry('src/entry.jsx')
  let entry = wrap(entryCode)
  checkForbidden('client.js', entry)
  entry = `${entry.trimEnd()}\n/* resource-preview-build:${digest} */\n`
  checkSize('client.js', entry, ENTRY_LIMIT)
  const entryPath = join(PACKAGE_DIR, 'client.js')
  writeFileSync(entryPath, entry)
  chmodSync(entryPath, 0o644)
  return { files: ['client.js', 'client.media.js', 'client.image.js', 'client.font.js', 'client.archive.js', 'client.binary.js'] }
}

/**
 * Verify the artifacts currently on disk without rewriting them.
 * @returns {{ files: string[] }} verified artifact names.
 */
export function verifyAll() {
  const files = ['client.js', 'client.media.js', 'client.image.js', 'client.font.js', 'client.archive.js', 'client.binary.js']
  for (const fileName of files) {
    const code = readFileSync(join(PACKAGE_DIR, fileName), 'utf8')
    checkForbidden(fileName, code)
    checkSize(fileName, code, fileName === 'client.js' ? ENTRY_LIMIT : CHUNK_LIMIT)
  }
  return { files }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--verify')) {
    await buildAll()
    const verified = verifyAll()
    console.log(`resource-preview: verified ${verified.files.join(', ')}`)
  } else {
    const built = await buildAll()
    console.log(`resource-preview: built ${built.files.join(', ')}`)
  }
}
