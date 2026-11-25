# 资源多格式预览 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 `dsh-resource-url-compat` bundle 中，保留 `dsh-resource://` URL 修复，并新增原生优先、Worker 隔离的多格式文件预览。

**Architecture:** 入口先装 URL getter，再通过 `ctx.inject` 等待内置文件预览的 `documentPreviews`/`slots`/`locale` 服务；五种格式族各注册一个 `bytes-complete` 预览定义和懒加载 keyed 正文。容器解析在一次性 Web Worker 中完成，主线程只渲染有界结果；媒体、图片、字体、gzip/deflate 解压使用浏览器原生能力。

**Tech Stack:** 浏览器 ES modules + React 18（宿主 module table）、`@deepseek-ai/dsh-client-ui-primitives`、Web Worker、`DecompressionStream`、`FontFace`、原生媒体元素、Node `node --test`、Vite 8（仅构建）。

**Spec:** `plugins/dsh-resource-url-compat/docs/DESIGN.md`（已批准）。

## Global Constraints

- 交付形态：就地构建并热加载 `plugins/dsh-resource-url-compat`；该目录未被 git 跟踪，不主动 `git add`/commit。
- 运行时不得新增 npm 依赖；只能使用宿主 module table 的 `react`、`react/jsx-runtime`、`react-dom`、`@deepseek-ai/dsh-client-ui-primitives`。
- 构建只用仓库根已有的 Vite 8；不改 `pnpm-lock.yaml`、不改 `packages/`。
- 完整能力以 Chromium 124+ 为目标，Vite target `chrome100`；Safari/Firefox 和旧内核只保证探测后降级。
- 用户文件内容只走 React 文本节点；禁止 `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`dangerouslySetInnerHTML`/`eval`/`new Function`/`importScripts`/`fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource`。
- 完整文件上限 32 MiB（Host 既有）；Worker 并发 ≤4（低内存 1）、在飞字节 ≤64 MiB（低内存 32 MiB）、队列 ≤12、任务超时 8 s。
- ZIP/TAR 条目 ≤4096，单条解压 ≤16 MiB，总解压 ≤64 MiB，压缩比 >200:1 标记 bomb，文本条目预览 ≤4 MiB，图片条目 ≤8 MiB，路径 ≤1024 字符。
- 字体表 ≤4096、名称记录 ≤4096、单名称串 ≤4 KiB；二进制扫描前 1 MiB、字符串 ≤256 条；十六进制每页 8 KiB。
- 不使用 `AbortSignal.any`、`structuredClone`、`crypto.randomUUID` 作为必要条件。
- 所有可见文案走 `ctx.locale` 的 `resourcePreview` 命名空间（zh/en），其余语言回退英文；不写死英文 UI 字符串。
- 所有 `URL.createObjectURL`、`FontFace`、Worker、定时器、事件监听都有对称清理；插件卸载后不残留。
- 不覆盖内置渲染器已处理的 `pdf/doc/docx/ppt/pptx/xls/xlsx/csv/tsv`。

## Review Focus

1. **损坏/超限/压缩炸弹**：随机字节 `.zip`、截断 central directory、声明解压 10 GB 的条目、超 64 MiB 的 tar.gz，都必须在有限时间内给出本地化错误，不能挂起或把主线程/Worker 内存打满。对应测试落在 Task 7（zip/tar 上限 + 池超时/取消）。
2. **恶意路径与不可见字符**：`../../etc/passwd`、`/absolute`、`C:\`、NUL、RTL override 的条目名必须被标记/清洗后按文本显示，不能伪装成安全路径。对应测试落在 Task 7 的 path-safety 单测。
3. **后缀与内容不符**：`.mp4` 实际是 ZIP、`.ttf` 实际是随机字节、加密 ZIP 条目、无 Range 的损坏媒体，都显示原因和 Binary 退路，不能黑屏或无限 loading。对应测试落在 Task 5/6/7 的 sniff/错误码测试。
4. **能力缺失**：无 `Worker`、无 `DecompressionStream`、无 `FontFace`、无容器查询、`Worker` Blob 被 CSP 拒绝时，预览必须降级而不是崩溃。对应测试落在 Task 3（池注入缺失）、Task 6/7（解压器缺失）和 Task 9 的浏览器能力验证。
5. **chunk 失败与陈旧缓存**：chunk 404、初次加载失败后重试、仅改 chunk 后的 HMR，都必须能显示错误并重试或拿到新版本；不能白屏或一直用旧解析器。对应测试落在 Task 2（构建戳/静态检查）和 Task 4（loader 失败重试）。

---

### Task 1: Vite 构建与 chunk 骨架

**Files:**
- Create: `plugins/dsh-resource-url-compat/scripts/build.mjs`
- Create: `plugins/dsh-resource-url-compat/src/entry.jsx`
- Create: `plugins/dsh-resource-url-compat/src/chunks/binary.jsx`
- Create: `plugins/dsh-resource-url-compat/tests/build.test.mjs`
- Modify: `plugins/dsh-resource-url-compat/package.json`

**Interfaces:**
- Produces: `scripts/build.mjs` 的 `buildAll()`，输出 `client.js` 与 `client.<family>.js`，每个产物是 `window.__ModuleLoader__.load({ id, chunk?, factory(require){...} })`。
- Produces: `src/entry.jsx` 至少导出 `apply`/`inject`，并保留 URL 补丁；`src/chunks/binary.jsx` 导出 `BinaryBody`。

- [ ] **Step 1: 写失败的构建契约测试**

```js
// tests/build.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../', import.meta.url).pathname
const read = name => readFileSync(join(root, name), 'utf8')

test('entry registers the package factory without a static chunk', () => {
  const entry = read('client.js')
  assert.match(entry, /__ModuleLoader__\.load\(/)
  assert.match(entry, /id:\s*"dsh-resource-url-compat"/)
  assert.doesNotMatch(entry, /require\.async\("\.\/client\./)
})

test('chunk registers owner id and chunk name', () => {
  const chunk = read('client.binary.js')
  assert.match(chunk, /id:\s*"dsh-resource-url-compat"/)
  assert.match(chunk, /chunk:\s*"client\.binary\.js"/)
  assert.match(chunk, /BinaryBody/)
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test plugins/dsh-resource-url-compat/tests/build.test.mjs`
Expected: FAIL（`client.js`/`client.binary.js` 不存在或不是新格式）。

- [ ] **Step 3: 实现构建脚本和最小源码**

`scripts/build.mjs` 用 `import('vite')` 的 `build` API：单入口 CJS library、`configFile:false`、`root` 指向插件目录、`outDir` 指向插件目录、`emptyOutDir:false`、`minify:true`、`target:'chrome100'`、external 为 React 与 primitives。包装 CJS 输出：

```js
window.__ModuleLoader__.load({ id: "PKG", chunk: "client.binary.js", factory(require) {
  const module = { exports: {} }; const exports = module.exports;
  /* Vite CJS code */
  return module.exports;
} });
```

入口先写最小 `apply(ctx)`：探测并安装 URL getter（从旧 `client.js` 搬来），然后返回；`src/chunks/binary.jsx` 返回一个显示 `content.kind` 的占位正文，用于验证 chunk 路由。

- [ ] **Step 4: 运行构建契约测试**

Run: `node scripts/build.mjs && node --test plugins/dsh-resource-url-compat/tests/build.test.mjs`
Expected: PASS，且 `client.js`/`client.binary.js` 被生成。

- [ ] **Step 5: 构建戳与静态扫描**

在 `scripts/build.mjs` 计算所有 chunk 的 SHA-1，构建入口后追加等长注释 `/* resource-preview-build:<sha1> */`，并扫描产物禁止 API 与体积预算（入口 ≤48 KiB，chunk ≤96 KiB）。Run: `node scripts/build.mjs --verify`
Expected: PASS。

### Task 2: 运行时核心

**Files:**
- Create: `src/runtime/path.js`, `src/runtime/formats.js`, `src/runtime/limits.js`, `src/runtime/sniff.js`, `src/runtime/pool.js`, `src/runtime/cache.js`, `src/runtime/chunks.js`, `src/runtime/validate.js`
- Create: `tests/path.test.mjs`, `tests/formats.test.mjs`, `tests/sniff.test.mjs`, `tests/pool.test.mjs`, `tests/validate.test.mjs`, `tests/cache.test.mjs`

**Interfaces:**
- `filePathOf(address: string): string | undefined`；`fileNameOf(path: string): string`；`suffixOf(path: string): string`。
- `FAMILY_DEFINITIONS`：每项 `{ id, chunk, extensions, binaryExtensions, titleKey }`；`binary` 包含专用族后缀作为备选。
- `definitionOf(family, t)`：`{ id, extensions, binaryExtensions, priority:'extension', title:() => t(family.titleKey), loading:'bytes-complete' }`。
- `LIMITS`：设计表的值；`poolBudget(navigatorLike): { maxWorkers, maxBytes, maxQueue }`。
- `sniffMedia(bytes: Uint8Array): { kind:'audio'|'video', mediaType:string } | undefined`。
- `createPool({ createWorker, maxWorkers, maxBytes, maxQueue, setTimeout, clearTimeout }): { run(job): Promise<unknown>, dispose(): void }`；job `{ source, payload, transfer?, timeoutMs, signal?, validate? }`。
- `createResultCache(): { get(bytes, kind), set(bytes, kind, value), clear() }`。
- `createChunkLoader(require): { load(fileName), clear(fileName), dispose() }`。
- `validateWorkerResult(kind: string, value: unknown): unknown`，非法时抛 `Error('invalid')`。

- [ ] **Step 1: 写纯函数失败测试**

`tests/path.test.mjs` 断言 `dsh-resource://file/session/s//w/a.md` → `/w/a.md`，含 `%23`/`%20` 的段解码一次，非 session 地址返回 undefined。`tests/formats.test.mjs` 断言每个定义 id/chunk 唯一、扩展名无前导点且小写、`binaryExtensions ⊆ extensions`、`binary` 覆盖专用族后缀、没有 `pdf/doc/docx/ppt/pptx/xls/xlsx/csv/tsv`。`tests/sniff.test.mjs` 用最小 magic 样本断言 mp4/webm/wav/flac/ogg/mp3 与错误 magic。

- [ ] **Step 2: 运行并确认失败**

Run: `node --test plugins/dsh-resource-url-compat/tests/path.test.mjs plugins/dsh-resource-url-compat/tests/formats.test.mjs plugins/dsh-resource-url-compat/tests/sniff.test.mjs`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 path/formats/limits/sniff**

按设计 §5 表列扩展；`binary` 的扩展由专用族并集再加其余后缀组成。路径按 `dsh-resource://file/` 前缀、`session/<id>/<segments>` 解析，每段 `decodeURIComponent` 一次，失败返回 undefined。媒体 sniff 只读前 16 字节，未知 magic 返回 undefined。

- [ ] **Step 4: 运行纯函数测试**

Run: 同上。Expected: PASS。

- [ ] **Step 5: 写池/缓存/校验失败测试**

`tests/pool.test.mjs` 用假 Worker 断言：最多 `maxWorkers` 同时运行；`activeBytes + next <= maxBytes`；队列满同步拒绝 `busy`；超时 terminate 并返回 `timeout`；`AbortSignal` 取消队列/运行中任务；`dispose()` 清空队列并拒绝全部。`tests/cache.test.mjs` 断言同一字节对象缓存命中、不同对象不命中、`clear()` 后不命中。`tests/validate.test.mjs` 拒绝缺字段、超 4096 条目、非法 code、负数 size。

- [ ] **Step 6: 实现 pool/cache/chunks/validate**

池只负责调度：任务复制 `payload.bytes`（`bytes.slice()`）后 transfer，Worker 收到 `{ v:1, kind, bytes, limits, selection? }`；结果经 `validate` 后才 settle。缓存以 `WeakMap` 为根。chunk loader 缓存 Promise，失败删除以便重试。

- [ ] **Step 7: 运行全部运行时测试**

Run: `node --test plugins/dsh-resource-url-compat/tests/*.test.mjs`
Expected: PASS。

### Task 3: 入口注册与懒加载正文

**Files:**
- Modify: `src/entry.jsx`
- Create: `src/runtime/style.js`、`src/locales.js`、`src/runtime/runtime.js`
- Create: `tests/registration.test.mjs`

**Interfaces:**
- `apply(ctx)`：先 `applyUrlCompat(ctx)`，再 `ctx.inject(['documentPreviews','slots','locale'], scope => register...)`；没有任何注入时 URL 补丁仍生效。
- `createRuntime({ require })` → `{ pool, chunks, cache, limits }`；由 body 的 `inject: () => ({ runtime })` 提供。
- `registerPreviews(scope, runtime)`：注册 5 个定义和 5 个 keyed 正文；正文组件由 `lazyBody(chunkFile, exportName)` 生成稳定组件。

- [ ] **Step 1: 写失败测试（纯映射）**

`tests/registration.test.mjs` 断言 `definitionOf(family, t)`（由 Task 2 的 `formats.js` 导出）返回 `{ id, extensions, binaryExtensions, priority:'extension', title:t(family.titleKey), loading:'bytes-complete' }`，并断言 5 个 id 与 chunk 文件一一对应。

- [ ] **Step 2: 实现 locales/style/runtime/entry**

字典 `resourcePreview` 至少含 `viewer.media/image/font/archive/binary`、`loading`、`retry`、`chunkFailed`、`busy`、`decodeFailed`、`tooLarge`、`unsupported`、`encrypted`、`bomb`、`unsafePath`、`truncated`、`size.*`、`font.*`、`archive.*`、`binary.*`、媒体错误键。`style.js` 导出 `STYLES` 与 `installStyles()`（创建 `<style data-resource-preview>`，返回移除器）。`entry` 把所有注册包在 `scope.effect` 中，正文注册用 `ctx.slots.inject('sidebar.right.tab.document', () => ctx.slots.register({ name, key, locale:NS, inject:()=>({runtime}) }, Body))`。

- [ ] **Step 3: 加 lazyBody 的重试测试**

用假 `require.async` 第一次 reject、第二次 resolve，断言组件先显示错误、点击 Retry 后渲染 chunk 导出。Run: `node --test plugins/dsh-resource-url-compat/tests/registration.test.mjs`
Expected: PASS（用 React test renderer? 不可用；改为只测 `createChunkLoader` 的失败清除/重试语义，UI 由 Task 9 浏览器验证）。

- [ ] **Step 4: 构建并静态检查**

Run: `node scripts/build.mjs --verify`
Expected: PASS，入口不含静态 chunk require。

### Task 4: 媒体与额外图片

**Files:**
- Create: `src/media/body.jsx`, `src/media/entry.jsx`, `src/image/body.jsx`, `src/image/entry.jsx`
- Create: `tests/media.test.mjs`, `tests/image.test.mjs`

**Interfaces:**
- `MediaBody(props)`：`content.kind==='bytes'`，用 `fileNameOf(filePathOf(props.resourceAddress))` 和后缀决定 audio/video，`sniffMedia` 复核 magic；创建 Blob URL，`<audio controls preload="metadata">`/`<video controls preload="metadata" playsInline>`；`onError` 映射 `MediaError.code`；cleanup revoke。
- `ImageBody(props)`：`<img src={blobUrl} decoding="async">`，`load` 检查 `naturalWidth/Height` ≤16,384 且乘积 ≤16,777,216；失败显示 `image.decodeFailed` + 提示 viewer 下拉切 Binary；cleanup revoke。
- `mediaUrlFor(bytes, path)`/`imageUrlFor(bytes, path)` 纯函数可测。

- [ ] **Step 1: 写失败测试**

`tests/media.test.mjs` 断言 `.m4a` → audio/mp4、`.mp3` ID3 → audio/mpeg、`.wav` RIFF → audio/wav、`.mp4` 无 ftyp → undefined；`tests/image.test.mjs` 断言 AVIF/HEIC 的 media type 与像素上限函数。Run: 两者，Expected: FAIL。

- [ ] **Step 2: 实现媒体/图片正文与 chunk 入口**

每个 chunk 用 `export function MediaBody(props)` / `export function ImageBody(props)`；入口组件不接触 ctx，只用 props（`content`、`resourceAddress`、`useResource`、`useTabInfo`、`t`）。媒体不 autoplay；错误用 `role="alert"`，正文根 `data-resource-preview="media"`/`"image"`。

- [ ] **Step 3: 运行测试与构建**

Run: `node --test plugins/dsh-resource-url-compat/tests/media.test.mjs plugins/dsh-resource-url-compat/tests/image.test.mjs && node scripts/build.mjs --verify`
Expected: PASS。

### Task 5: 字体

**Files:**
- Create: `src/workers/font-entry.js`, `src/workers/font-worker.js`, `src/workers/pure/sfnt.js`
- Create: `src/font/body.jsx`, `src/font/entry.jsx`
- Create: `tests/sfnt.test.mjs`

**Interfaces:**
- `parseSfnt(bytes, limits)` → `{ format:'ttf'|'otf'|'woff'|'woff2', tables: string[], family?, subfamily?, fullName?, version?, unitsPerEm?, ascender?, descender?, weight?, glyphs?, axes? }`；越界抛 `invalid`，超表数抛 `tooLarge`。
- `FontBody`：`pool.run({ source: FONT_WORKER_SOURCE, payload:{kind:'font-meta', bytes, limits}, timeoutMs:8000, validate })`；成功后 `new FontFace('dsh-resource-font-'+counter, 'url('+blobUrl+')')`，`load()` 后 `document.fonts.add`；样张三档；cleanup `document.fonts.delete` + revoke。
- `FontBody` 在 `FontFace`/`document.fonts` 缺失时只渲染元数据。

- [ ] **Step 1: 写失败测试**

用最小 sfnt 字节（表目录 + name 表）断言 family/fullName/unitsPerEm；截断表目录抛 `invalid`；表数 4097 抛 `tooLarge`；WOFF2 只返回格式/表 tags。Run: `node --test plugins/dsh-resource-url-compat/tests/sfnt.test.mjs`，Expected: FAIL。

- [ ] **Step 2: 实现 sfnt/worker/FontBody**

Worker 只解析表目录与 name/head/hhea/maxp/OS/2/fvar；WOFF1 的 name 表若压缩，用 `DecompressionStream('deflate')` 流式解压并计入 4 KiB 上限；WOFF2 跳过表数据。`FontBody` 生成 family 名用计数器，不用 `crypto.randomUUID`。

- [ ] **Step 3: 测试与构建**

Run: `node --test plugins/dsh-resource-url-compat/tests/sfnt.test.mjs && node scripts/build.mjs --verify`
Expected: PASS。

### Task 6: 压缩包

**Files:**
- Create: `src/workers/archive-entry.js`, `src/workers/archive-worker.js`, `src/workers/pure/zip.js`, `src/workers/pure/tar.js`, `src/workers/pure/gzip.js`, `src/workers/pure/path-safety.js`
- Create: `src/archive/body.jsx`, `src/archive/entry.jsx`
- Create: `tests/zip.test.mjs`, `tests/tar.test.mjs`, `tests/path-safety.test.mjs`

**Interfaces:**
- `parseZip(bytes, limits)` → `{ archives: 'zip', entries: Entry[], truncated: boolean }`；`Entry = { path, bytes, compressedBytes, method, encrypted, unsafe, bomb, ratio }`。
- `readZipEntry(bytes, index, limits)` → `{ kind:'text', text } | { kind:'image', bytes, mediaType } | { kind:'unsupported', reason }`；流式解压，超限抛 `tooLarge`/`bomb`。
- `parseTar(bytes, limits)`、`parseGzip(bytes, limits)`；tgz 用 `DecompressionStream('gzip')` 边解压边解析 tar。
- `safeArchivePath(raw)` → `{ display, unsafe }`；去掉控制字符/bidi、NUL；绝对路径/`..`/盘符标记 unsafe；长度 ≤1024。
- `ArchiveBody`：左侧分页列表（每页 200 行），右侧选中条目详情；分页按钮本地化；`scrollportRef` 绑定列表；条目预览用 `archive-entry` 任务；`content-visibility` 可选。

- [ ] **Step 1: 写失败测试（Node zlib 造样本）**

`tests/zip.test.mjs`：store/deflate 条目、central directory、zip64 EOCD、加密位、method 99、声明的 10 GB 解压大小、ratio >200、流式解压 16 MiB 上限。`tests/tar.test.mjs`：ustar prefix、PAX longname、截断头、4097 条目。`tests/path-safety.test.mjs`：`../../etc/passwd`、`/abs`、`C:\`、NUL、RTL 标记。Run: 三个，Expected: FAIL。

- [ ] **Step 2: 实现纯解析器**

ZIP 从文件尾 64 KiB 内找 EOCD/ZIP64；只读中央目录；`DecompressionStream('deflate-raw')` 流式解压并累计字节。TAR 顺序解析 512 字节头；PAX/GNU longname 只取下一条路径。GZ 读头 + 原生解压。所有解析器接受 `limits` 并在入口校验。

- [ ] **Step 3: 运行纯测试**

Run: `node --test plugins/dsh-resource-url-compat/tests/zip.test.mjs plugins/dsh-resource-url-compat/tests/tar.test.mjs plugins/dsh-resource-url-compat/tests/path-safety.test.mjs`
Expected: PASS。

- [ ] **Step 4: 实现 ArchiveBody 与 worker 入口**

UI 断言 `data-resource-preview="archive"`、条目行 `data-archive-entry`、错误 `role="alert"`。目录条目不可选；加密/bomb/unsupported 行显示原因且禁用预览。压缩包为空显示 `archive.empty`。浏览器验证在 Task 9。

### Task 7: 二进制

**Files:**
- Create: `src/workers/binary-entry.js`, `src/workers/binary-worker.js`, `src/workers/pure/magic.js`, `src/workers/pure/hex.js`
- Create: `src/binary/body.jsx`, `src/binary/entry.jsx`
- Delete: `src/chunks/binary.jsx`（Task 1 的占位，改由 `src/binary/entry.jsx` 构建同一个 `client.binary.js`）
- Create: `tests/magic.test.mjs`, `tests/hex.test.mjs`

**Interfaces:**
- `scanBinary(bytes, limits)` → `{ format, summary: string[], strings: string[], truncated: boolean }`；`format` 为 `elf|pe|macho|wasm|sqlite|psd|zip|gzip|bzip2|xz|zstd|7z|rar|iso|dmg|class|pyc|tar|pdf|unknown`。
- `hexPage(bytes, offset, length)` → `{ offset, rows: [{ offset, hex, ascii }] }`；每页 512 行 × 16 字节，最多前 1 MiB。
- `formatBytes` 纯函数；`BinaryBody` 摘要卡片 + 字符串折叠 + 十六进制表 + 页码；`scrollportRef` 绑定十六进制滚动容器。

- [ ] **Step 1: 写失败测试**

`tests/magic.test.mjs`：ELF/PE/Mach-O/Wasm/SQLite/PSD/ZIP/GZIP/7Z/RAR 魔数；`tests/hex.test.mjs`：空、偏移跨页、ASCII 可打印、非 UTF-8 字节只显示点号。Run: 两者，Expected: FAIL。

- [ ] **Step 2: 实现纯解析器与正文**

Worker 只读头部和字符串，不执行/不加载；输出字符串经过长度/条数上限。主线程格式化前 1 MiB 的页；超过显示 `binary.truncated`。`BinaryBody` 不把原始文件文本拼成 HTML。

- [ ] **Step 3: 测试与构建**

Run: `node --test plugins/dsh-resource-url-compat/tests/magic.test.mjs plugins/dsh-resource-url-compat/tests/hex.test.mjs && node scripts/build.mjs --verify`
Expected: PASS。

### Task 8: 集成、元数据与文档

**Files:**
- Modify: `src/entry.jsx`, `src/locales.js`, `src/runtime/style.js`, `package.json`
- Modify: `locale/en.json`, `locale/zh.json`, `README.md`, `README.zh.md`, `docs/DETAIL.md`, `docs/DETAIL.zh.md`
- Create: `docs/TESTING.md`（本地验证步骤，不属于产品 docs 门）

**Interfaces:**
- 五组定义/正文/字典/样式全部生效；没有 `documentPreviews` 时只有 URL 补丁。
- `package.json` `files` 加入 `client.*.js`、`scripts.build`；`dsh.client.inject` 可加内置预览包名；`exports` 保留 `./client`。
- 插件 meta 描述改成“资源地址兼容 + 多格式预览”，说明 Worker、原生解码、支持范围和“不执行文件内容”。

- [ ] **Step 1: 构建并核对注册**

Run: `node scripts/build.mjs --verify`
Expected: PASS；grep 产物确认 5 个定义/正文注册、无禁用 API。

- [ ] **Step 2: 检查 locale/meta**

Run: 用 `node -e` 读取 locale JSON，断言 `meta.title`/`meta.description` 存在，`docs/DETAIL.md` 路径存在；`package.json` `files` 覆盖所有产物。

- [ ] **Step 3: 更新 README/DETAIL**

README 增加“多格式预览”章节：支持矩阵、上限、安全边界、安装后刷新/HMR、已知限制。DETAIL 增加一段用户可见说明和失败退路；图文与现有内容并存。

### Task 9: 浏览器验证与修复

**Files:**
- Create: `test-fixtures/`（不提交）：zip、tar、tar.gz、gz、ttf/woff2、wav、wasm、sqlite、损坏/超限样本
- Modify: 由观察结果决定（源文件与构建产物）

**Interfaces:**
- 使用 chrome-devtools 打开 `https://dsh.xaynet.com/`（token 由 `dsh_service_access_url` 提供），在 Workspace files 打开每个样本。
- 断言：`data-resource-preview` 出现、无 `resourceUnavailable`、console 无未捕获错误、除 Blob 外无新增网络请求、失败样本显示本地化原因、viewer 下拉可切 Binary、关闭 tab 后无残留 Worker/FontFace/Blob URL。

- [ ] **Step 1: 生成 fixtures**

用 Python `zipfile`/`tarfile`/`gzip`/`wave`/`sqlite3` 与现有仓库字体生成样本；WASM 用最小合法模块；损坏 ZIP 用随机字节；超限 ZIP 用一个 64 MiB 未压缩条目（压缩后仍小）。Run: `python3 plugins/dsh-resource-url-compat/scripts/make-fixtures.py`
Expected: `test-fixtures/` 出现预期文件。

- [ ] **Step 2: 构建并热加载**

Run: `node scripts/build.mjs && node scripts/build.mjs --verify`
然后在插件行 `set_plugin`（enabled true）触发重组合；刷新页面。
Expected: 行仍为启用，`client.js` 版本变化，页面无启动审计失败。

- [ ] **Step 3: 打开每个成功样本**

对 ZIP（含文本与 PNG 条目）/TAR/TGZ/GZ/TTF/WOFF2/WAV/WASM/SQLite 逐一检查 DOM、console、network；ZIP 还要点开文本条目和图片条目，确认 `archive-entry` 预览路径；截图证据。Expected: 正文出现、无错误、无自动播放、文件树/标签正常。

- [ ] **Step 4: 打开失败/边界样本**

损坏 ZIP、随机 `.zip`、超限条目、加密条目（若可生成）、错误后缀 magic、32 MiB 以上文件。Expected: 本地化错误、无挂起、无 Worker 泄漏；viewer 下拉可切 Binary。

- [ ] **Step 5: 清理与降级**

关闭所有 tab；禁用插件，确认 URL getter 恢复、预览注册消失、无残留样式；重新启用。若浏览器支持，模拟无 `DecompressionStream`（DevTools 覆盖）验证降级。Expected: 无残留，降级文案正确。

- [ ] **Step 6: 修复观察到的缺陷并重跑**

每个缺陷回到对应 Task 的测试/实现，修完重跑 `node --test` + `node scripts/build.mjs --verify` + 相关浏览器步骤，直到通过。

### Task 10: 最终验证与交付

- [ ] **Step 1: 跑完整本地检查**

Run: `node --test plugins/dsh-resource-url-compat/tests/*.test.mjs && node scripts/build.mjs --verify`
Expected: 全 PASS。

- [ ] **Step 2: 检查交付物**

确认 `client.js`、5 个 chunk、`src/`、`scripts/`、`tests/`、`docs/DESIGN.md`、`docs/PLAN.md`、`README*`、locale 都在；未 `git add`；无临时 fixtures 被提交（目录未跟踪）。

- [ ] **Step 3: 报告**

按用户语言报告：支持格式、未实测格式/旧 WebView、性能/安全上限、构建/热加载命令、浏览器验证证据和剩余限制。
