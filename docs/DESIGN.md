# 资源预览扩展设计（原生优先 + Worker 池）

日期：2026-11-25
范围：`plugins/dsh-resource-url-compat`
状态：待批准

## 1. 意图与为什么

这个 bundle 现在只做一件事：在旧 Chromium 上修复 `dsh-resource://` 的 host 解析，让文件预览能定位资源。内置 `ui-sidebar-documentpreview` 覆盖文本、Markdown、代码、图片、PDF、doc/docx/ppt/pptx、xlsx/xls/csv/tsv 和 HTML；它把视频、音频、压缩包、字体、wasm/可执行文件、SQLite、PSD、TIFF/HEIC 等后缀明确标成“不支持”。

目标是在同一个 bundle 内补齐这些文件的可预览能力，并且：

- 浏览器原生能解码的，直接交给原生（`<video>`/`<audio>`、图片解码、`FontFace`、`DecompressionStream`），不重新实现编解码器。
- 必须解析容器的，放到一次性 Web Worker 中，主线程只渲染有界的、已校验的结果。
- 解析失败、编码不支持、超限，都给出可读的本地化原因和可选替代视图，而不是空白或“服务不可用”。

这解决的是“点击工作区文件后看不到内容”的剩余一半问题：URL 修复让资源地址能被识别，本扩展让更多后缀有真正的渲染器。

## 2. 目标、非目标、反目标

### 目标

- 媒体：MP4/M4V/MOV/WebM/MKV/OGV/AVI/FLV/WMV、MP3/WAV/FLAC/OGG/OGA/M4A/AAC/OPUS/WMA 的只读播放界面。
- 额外图片：AVIF/TIFF/TIFF/HEIC/HEIF 的原生解码尝试，失败时提供安全的结构视图。
- 字体：TTF/OTF/WOFF/WOFF2 的字样渲染 + Worker 解析的元数据；WOFF2 只做目录级元数据。
- 压缩包：ZIP/JAR/TAR/GZ/TGZ/TAR.GZ 的条目列表；可选地安全预览单个文本或图片条目。
- 其余明确不可按文本阅读的后缀：WASM/EXE/DLL/SO/DYLIB/BIN/O/CLASS/PYC/SQLITE/DB/DMG/ISO/IMG/PSD/AI/SKETCH/BZ2/XZ/ZST/7Z/RAR/EOT/ODT/ODS/ODP/PAGES/NUMBERS 等的只读结构/十六进制视图。
- 所有解析任务并发受控、可取消、有超时、有上限；插件卸载时全部终止。
- 不改变内置预览器已有的格式与行为；扩展实现以 `extension` 优先级注册，不覆盖内置 `builtin` 渲染器。

### 非目标

- 不编辑、不导出、不转码、不播放 DRM 内容。
- 不实现 3D/EPUB/SQLite 内容查询/TIFF/HEIC/PSD 像素解码/ODF 文档排版；这些需要第三方 WASM 或 Host 转换，留给后续版本。
- 不改变 Host 文件服务、Remote API、Session 格式或内置预览包。
- 不联网、不执行文件里的任何内容、不把文件文本当 HTML。

### 反目标（即使功能“能跑”也算失败）

- 任何用户文件文本进入 `innerHTML`/`dangerouslySetInnerHTML`/`eval`/`new Function`。
- 压缩包解压无总量上限，或信任 ZIP 条目声明的解压后大小。
- 解析在主线程按文件大小线性阻塞，或把 4096 条列表一次性渲染成 4096 个重型节点。
- 插件卸载后仍有 Worker、Blob URL、字体或定时器存活。
- 媒体文件未经过嗅探就用后缀猜测的 MIME 喂给解码器；或自动播放。
- 为了“通用”引入运行时第三方解码库、CDN 脚本或动态网络请求。

## 3. 约束

- 这是 profile 本地 bundle（`plugins/` 下，非 `packages/*` workspace 包）。运行时必须自包含，不新增安装依赖。
- 浏览器半通过 `window.__ModuleLoader__` 的懒 CJS factory 加载；包内 chunk 以 `client.<family>.js` 形式由 `/plugins/<package>/...` 路由按需提供。
- 依赖的公开扩展点：`ctx.documentPreviews.register(...)`、`ctx.slots.inject('sidebar.right.tab.document', ...)`、`ctx.locale`、`ctx.slots`、`remote.workspaceFiles`（本项目使用 `bytes-complete`，不直接调用 Remote）。
- 文件内容由预览 owner 以 `content: { kind: 'bytes', data: Uint8Array<ArrayBuffer> }` 提供；Host 的完整文件上限是 32 MiB。超出时 owner 已经显示失败，本扩展不重复读取。
- 不支持 `documentPreviews` 服务的 profile（例如未启用内置预览）必须保持原有 URL 修复功能；预览注册只是等待服务，不阻塞 URL 补丁。
- 目标浏览器：完整路径以 Chromium 124+（本插件动机所在的旧 WebView 下限）为准；构建 target 用 `chrome100` 以留出语法余量。Safari/Firefox 不承诺旧引擎，但所有新能力都必须探测并优雅降级（`Worker`、`DecompressionStream`、`FontFace`、`<img>` 解码、`hardwareConcurrency`、`deviceMemory`、容器查询）。不使用 `AbortSignal.any`、`structuredClone`、`crypto.randomUUID` 作为必要条件；它们缺失时用现成替代或降级。
- 交付形态：profile 里已经安装的是指向 `plugins/dsh-resource-url-compat` 的本地链接，本次交付为**原地构建并热加载的本地 bundle**，包含源码、测试、构建脚本和产物；不主动 `git add`/commit（`plugins/` 当前未跟踪），除非你明确要求纳入版本控制。
- 所有面向用户的文案走 `ctx.locale` 字典；代码注释用英文。
- 构建只在本仓库 checkout 中运行，使用根 `node_modules` 里已有的 Vite 8（Node 解析向上命中），不新增 `devDependencies`、不改 `pnpm-lock.yaml`，也不在插件目录执行安装。产物提交后运行时不依赖构建工具。`scripts/build.mjs` 在找不到 Vite 时给出明确的“请在仓库根安装/使用已有 Vite”错误，而不是静默失败。

## 4. 已选方案与备选

### A. 原生优先 + 一次性 Worker + 懒加载 chunk（采用）

- 原生解码媒体/图片/字体；只把容器解析和压缩包读取放入 Worker。
- 每个解析任务一个一次性 Worker，最多 4 个并发；结果按内容对象缓存。
- 每种格式族一个 `client.<family>.js` chunk，首次选中该渲染器才加载。
- 不引第三方解码器，攻击面最小，旧浏览器降级路径清楚。

代价：ZIP/TAR/GZ 只能列条目和有限预览，不能像完整归档工具那样任意解压；TIFF/HEIC/PSD 不能渲染像素；实现仍需要手写有界解析器。

### B. 重通用（否决）

在 A 之上加 3D/EPUB/SQLite/TIFF/HEIC/PSD/ODF，需要 `three`、`sql.js`、`utif`、`libheif`、Host LibreOffice 等多套运行时。首屏体积、内存峰值、供应链与解析攻击面都显著上升，且和“原生优先、极致安全”冲突。用户已选择 A，B 留作后续独立提案。

### C. 只做媒体（否决）

只覆盖原生 `<video>`/`<audio>` 最省事，但压缩包、字体和二进制文件仍然显示“不支持”，没有完成“各种格式”的目标。

## 5. 格式矩阵

所有扩展定义都使用 `loading: 'bytes-complete'`、`wrap: false`，并列入 `binaryExtensions`，因此不会出现“纯文本”回退。所有定义使用 `priority: 'extension'`，不覆盖内置渲染器。

| 定义 id 后缀族 | 扩展名 | 渲染方式 | 线程 |
|---|---|---|---|
| `media` | `mp4,m4v,mov,webm,mkv,ogv,avi,flv,wmv,mp3,wav,flac,ogg,oga,m4a,aac,opus,wma` | `<video>`/`<audio>` 原生控件；Blob URL；magic 嗅探决定 MIME；错误码本地化 | 原生解码线程 |
| `image` | `avif,tif,tiff,heic,heif` | `<img>` 原生解码，fit 布局；失败时提示切到 Binary | 原生解码 |
| `font` | `ttf,otf,woff,woff2` | `FontFace` + Blob URL 渲染字样；Worker 解析 sfnt 元数据 | Worker（元数据） |
| `archive` | `zip,jar,tar,gz,tgz,tar.gz` | Worker 列条目；选中条目按需解压/预览（文本/图片） | Worker |
| `binary` | 上述所有 + `wasm,exe,dll,so,dylib,bin,o,class,pyc,sqlite,db,dmg,iso,img,psd,ai,sketch,bz2,xz,zst,7z,rar,eot,odt,ods,odp,pages,numbers` | 魔数/结构摘要 + 分页十六进制 + 有限字符串 | Worker（扫描）+ 主线程分页格式化 |

`binary` 与专门族共享扩展名，形成下拉备选：专用渲染器是默认，`Binary` 是失败时的退路。`matchingDocumentPreviews` 保留全部匹配项；专用定义先注册，因此默认选中。

内置已处理的 `pdf/doc/docx/ppt/pptx/xls/xlsx/csv/tsv` 不列入扩展，避免覆盖产品渲染器。

## 6. 架构

```
client.js (entry, 立即执行 URL 补丁)
├─ url-compat: URL.prototype.hostname/host getters (无 inject，激活即打补丁)
├─ runtime
│  ├─ worker pool (仅调度，不常驻 Worker)
│  ├─ chunk loader (每个格式族一个 Promise，失败可重试)
│  ├─ WeakMap 结果缓存 (key = content.data)
│  └─ limits / path / sniff helpers
├─ documentPreviews definitions (media/image/font/archive/binary)
└─ lazy body (每个定义一个稳定组件)
   └─ require.async('./client.<family>.js')
      ├─ React 正文组件
      └─ worker source 字符串 → Blob URL → new Worker
```

### 6.1 入口与 URL 补丁

`client.js` 的 `apply(ctx)` 第一件事仍是探测并安装 `URL.prototype.hostname/host` getter，不进入任何 `ctx.inject` 子 scope，保证首个资源地址解析前生效。随后：

```js
ctx.inject(['documentPreviews', 'slots', 'locale'], (scope) => { ... })
```

在子 scope 中注册字典、定义、正文和 runtime。没有 `documentPreviews` 的 profile 只保留 URL 补丁，符合原 bundle 语义。

### 6.2 Worker 池（一次性 Worker + 并发上限）

- 并发上限：`min(4, max(1, (navigator.hardwareConcurrency ?? 4) - 1))`；`navigator.deviceMemory <= 2` 时降为 1。
- 在飞字节预算：默认 64 MiB，低内存设备 32 MiB；只有 `activeBytes + job.bytes <= budget` 才启动新任务；任务队列非空且没有活动任务时，至少放行一个，避免超大文件饿死。这样 4 个 32 MiB 的归档不会同时复制到 128 MiB。
- 排队上限 12；满时立即以本地化 `busy` 失败，不无限堆积待解析内容。
- 每个任务独立创建 Worker，任务结束（成功/失败/超时/取消）立即 `terminate()`，Blob URL 立即 `revokeObjectURL`。
- 任务超时：archive/font/binary 默认 8 秒；图片原生解码不设 Worker 超时，但忽略已完成后的结果。
- 取消：用 `AbortSignal`（tab 生命周期的 `tab.signal` + body 自己的 unmount controller）。队列中的任务出队；运行中的任务终止。
- 结果校验：主线程对 Worker 消息做结构校验（对象、`ok` 布尔、`code` 枚举、数组/数字上限），不信任 Worker 的任意输出。
- 插件卸载：abort 全部队列、terminate 全部活动 Worker、清空 chunk/结果缓存。

### 6.3 请求/响应协议

```ts
type Request = {
  v: 1
  kind: 'archive-list' | 'archive-entry' | 'font-meta' | 'binary-scan'
  bytes: ArrayBuffer            // 传输所有权，worker 侧不再回传
  limits: Limits                // 由主进程按 kind 固定下发
  selection?: { index: number } // archive-entry
}
type Response =
  | { v: 1; ok: true; kind: string; value: unknown }
  | { v: 1; ok: false; code: 'invalid'|'unsupported'|'tooLarge'|'bomb'|'encrypted'|'truncated'|'timeout' }
```

Worker 独立校验 `v`、`kind`、`bytes.byteLength`、`limits` 数值范围；不读取全局、不执行任何网络操作。每次 `postMessage` 只回一个最终结果；不实现流式多消息，保持生命周期单一。

### 6.4 分块加载

- 入口注册稳定的 `LazyBody` 组件；该组件在 mount 时调用 runtime 的 `loadChunk('./client.<family>.js')`。
- 加载成功渲染 chunk 导出的 `Body`；失败显示本地化错误和 **Retry**（清掉失败 Promise 后重试）。
- 不使用 `React.lazy`，避免 React 缓存 rejected import 造成“必须刷新页面”。
- chunk 只依赖基线模块：`react`、`react/jsx-runtime`、`@deepseek-ai/dsh-client-ui-primitives`（可选）。不静态 import 其他功能插件。

### 6.5 注册形态（实现者可直接照此写）

```js
// 定义与正文一一对应；定义先注册，正文等待被声明的子 slot。
ctx.effect(() => scope.documentPreviews.register({
  id: 'dsh-resource-url-compat/archive',
  extensions: ['zip', 'jar', 'tar', 'gz', 'tgz', 'tar.gz'],
  binaryExtensions: ['zip', 'jar', 'tar', 'gz', 'tgz', 'tar.gz'],
  priority: 'extension',
  title: () => t('viewer.archive'),
  loading: 'bytes-complete',
}), 'resource preview: archive metadata')

ctx.effect(() => scope.slots.inject('sidebar.right.tab.document', () => scope.slots.register({
  name: 'sidebar.right.tab.document',
  key: 'dsh-resource-url-compat/archive',
  locale: NS,
  inject: () => ({ runtime }),   // body 额外收到 runtime（pool/chunks/limits/path）
}, ArchiveBody)), 'resource preview: archive body')
```

`sha` 或 `id` 必须稳定；`key` 必须等于定义 `id`。正文从 props 读取 `content`、`resourceAddress`、`useResource`、`useTabInfo` 和 `t`；`runtime` 是唯一的私有注入。

### 6.6 能力探测与降级

| 缺失能力 | 行为 |
|---|---|
| `Worker` / Blob Worker 被 CSP 禁止 | 媒体和图片继续原生工作；归档/字体/二进制显示本地化“此浏览器不能后台解析”，不退回主线程做无界解析。二进制仍可用主线程前 8 KiB 十六进制（有界）。 |
| `DecompressionStream` | ZIP/TAR 列表仍可读（只读目录/头部）；ZIP 压缩条目预览、GZ/TGZ 列表返回 `unsupported`，正文说明并提示 Binary 视图。 |
| `FontFace` / `document.fonts` | 只显示 Worker 元数据，不渲染字样。 |
| `deviceMemory` | 只用 `hardwareConcurrency` 推算并发；仍受在飞字节预算约束。 |
| 容器查询 | 用 flex-wrap 基准布局，不依赖 `@container` 才能堆叠。 |
| `<img>` 不支持目标格式 | 显示本地化解码失败 + viewer 下拉提示切到 Binary。 |

`AbortSignal.any` 不用：body 自己创建 `AbortController`，在 `tab.signal` abort 时手动 `abort()` 并清理监听；`structuredClone` 不用（Worker 消息本身走结构化克隆）；字体 family 名用插件内递增 id，不用 `crypto.randomUUID`。

### 6.7 缓存与结果

- `WeakMap<Uint8Array<ArrayBuffer>, Map<kind, Result>>`，以 owner 提供的字节对象为 key；tab 关闭后字节被回收，缓存随 key 消失。
- 缓存值只含派生结果（条目元数据、字体元数据、二进制摘要/字符串首段），不含源字节。
- 缓存值冻结（`Object.freeze` 深冻结或构造后不再修改），防止正文组件意外修改。
- archive-entry 结果单独按 `entry index` 缓存，限制最多 8 条、单条 8 MiB 解压结果；超限不缓存。
- 缓存属于插件实例，不挂全局。

### 6.6 正文组件的生命周期

每个正文接收 `DocumentPreviewProps` + inject face（`pool`、`chunks`、`limits`、路径助手）：

1. 从 `content.kind === 'bytes'` 取 `data`；不是 bytes 时渲染空。
2. 通过 `useResource<'file'>(resourceAddress)` 获取 `absolutePath`/`version`（用于显示和后续可选 URL，不用于缓存键）。
3. 用 `tab.signal` 和 body 自己的 controller 组合成取消信号；unmount 时 abort。
4. 原生渲染器（媒体/图片）在 `useEffect` 创建 Blob URL，cleanup revoke；字体额外从 `document.fonts` 删除。
5. Worker 渲染器在 `useEffect` 通过缓存或 `pool.run` 取结果；用代数 token 丢弃卸载后的结果；超时/取消不必更新 UI。
6. 大列表/十六进制用分页或窗口化渲染；不把全部结果一次塞进 DOM。

## 7. 限制与安全不变量

以下数值是固定的安全不变量（不是可调部署参数）。Worker 侧独立执行同一组上限，主线程的校验只是第二道门。

| 项 | 上限 | 原因 |
|---|---|---|
| 完整文件 | 32 MiB（Host 既有上限） | owner 已拒绝更大文件 |
| Worker 并发 | 4（低内存设备 1） | 控制峰值内存与 CPU |
| 在飞字节 | 64 MiB（低内存 32 MiB） | 控制复制与 Worker 峰值内存 |
| 排队 | 12 | 防止大量 tab 堆积 |
| 任务超时 | 8 s | 防止病态解析占用线程 |
| ZIP 条目数 | 4096 | 控制列表与内存 |
| TAR 条目数 | 4096 | 同上 |
| 单条目声明解压大小 | 16 MiB | 防止单条炸内存 |
| 解压总量 | 64 MiB | 防止多条目累积炸弹 |
| 压缩比 | 200:1 | 超过标记 `bomb`，不进入解压 |
| 文本条目内联预览 | 4 MiB | 控制字符串内存 |
| 图片条目内联预览 | 8 MiB | 控制 Blob 内存 |
| 条目路径长度 | 1024 字符 / 512 显示字符 | 控制 DOM 与日志 |
| 字体表数 | 4096 | 控制 sfnt 目录循环 |
| 字体名称记录 | 4096 / 单串 4 KiB | 控制元数据 |
| 二进制扫描 | 前 1 MiB | 限制字符串/魔数扫描 |
| 十六进制每页 | 8 KiB（512 行 × 16 字节） | 控制 DOM 行数 |
| 图片像素 | 16,777,216 总量 / 单边 16,384 | 与 PDF 预览同一像素上限 |
| 结果校验 | 结构 + 数值范围 | Worker 输出边界 |

**安全不变量：**

1. 用户文件内容不以 HTML/JS 解释；React 文本节点是唯一渲染通道。
2. 没有 `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`、`dangerouslySetInnerHTML`、`eval`、`new Function`、`importScripts`、`fetch`、`XMLHttpRequest`、`WebSocket`、`EventSource`。构建脚本静态扫描产物，发现即失败。
3. 压缩包不写文件系统；条目路径只用于显示，控制字符、bidi 覆盖字符、绝对路径和 `..` 段都被移除或标记为 unsafe。
4. 解压必须流式读取并累计字节数，达到上限立即 `cancel()`；不信任声明大小，不算完整个体再截断。
5. 媒体 MIME 由 magic 决定，不由后缀单独决定；后缀与 magic 不符时显示结构视图而不是喂给解码器。
6. 原生解码器（媒体/图片/字体）只接触 Blob，不接触应用 DOM 或网络；字体 family 名由插件生成，不使用文件里的 family 字符串作为 CSS 标识。
7. 所有 `URL.createObjectURL` 与 `FontFace` 都有对称清理；构建检查不能证明的，用浏览器验证覆盖。
8. 不自动播放；`<video>` 不设置 `autoplay`，`<audio>` 同理。
9. 不在主线程执行与文件大小线性相关的解析；列表/十六进制分页。

## 8. 各格式族的实现细节

### 8.1 媒体（media）

- 入口按后缀粗分 audio/video，但用 magic 复核：`ftyp`、`EBML`、`OggS`、`RIFF....WAVE`、`RIFF....AVI`、`fLaC`、`ID3`/`0xFFFx`、`FLV`。
- 生成 Blob 时使用嗅探出的 MIME（`video/mp4`、`video/webm`、`audio/mpeg` 等）。
- 音频渲染为居中的原生 `<audio controls preload="metadata">`；视频为 `<video controls preload="metadata" playsInline>`，`max-width/height` 适配容器。
- `error` 事件按 `MediaError.code`（1 ABORTED、2 NETWORK、3 DECODE、4 SRC_NOT_SUPPORTED）映射本地化文案；显示“浏览器不能解码此容器/编码”和 viewer 下拉提示。
- 不读取 duration 之外的元数据；`loadedmetadata` 仅显示时长/分辨率。
- 不使用 `/api/file` 流式路由；当前 Route 无 Range 支持且上限更小，Blob 能保证离线和认证边界。

### 8.2 额外图片（image）

- `<img>` + Blob URL，`decoding="async"`；`load` 后检查 `naturalWidth/Height`，超过像素上限则 revoke 并显示“过大”。
- `object-fit: contain`，宽度 100%，高度不超过容器；不实现自定义缩放（内置图片渲染器已有缩放；本族只做“能看见”）。
- 解码失败显示本地化“浏览器不能解码这种图片” + 提示用 viewer 下拉切到 Binary。

### 8.3 字体（font）

- Worker 只解析 sfnt 目录与 `name`/`head`/`hhea`/`maxp`/`OS/2`/`fvar` 表；不解析字形轮廓。
- TTF/OTF/WOFF：可读 `name` 表；WOFF2：只读头部和表目录（不引 Brotli），显示“压缩字体，仅显示目录信息”。
- 主线程 `new FontFace(uniqueFamily, url(blobUrl))`；`load()` 后 `document.fonts.add`；样张用 16/24/40 px 和本地化 pangram。
- 卸载：`document.fonts.delete(face)`、revoke URL；失败也清理。
- 元数据包括 family/subfamily、version、unitsPerEm、ascender/descender、weight/width、glyph 数、表 tags、可变字体轴（若有）。

### 8.4 压缩包（archive）

- ZIP：解析 EOCD → ZIP64 EOCD → central directory；条目字段：名字、压缩/未压缩大小、method、CRC、flags、时间、加密位、声明压缩比。支持 store/deflate；其他 method 标记 unsupported。
- TAR：顺序解析 512 字节头，支持 ustar prefix、GNU/PAX longname（只读元数据条目）；只接受常规文件/目录/符号链接标记；路径按安全规则清洗。
- GZ：读头（原文件名、mtime、XFL、OS），单文件；解压到 64 MiB 上限，展示元数据与可选的文本首段。
- TGZ/TAR.GZ：`DecompressionStream('gzip')` 流式解压，边解压边解析 tar 头；达上限标记 truncated。
- ZIP 条目预览：点击文件条目 → worker 只解压该条目，流式累计；文本（UTF-8 可解码且无 NUL）≤4 MiB 直接显示；图片（magic 匹配 png/jpeg/gif/webp/avif）≤8 MiB 生成 Blob URL；其他显示“安全预览仅支持文本和常见图片”。
- 加密条目、ratio > 200、unsupported method 不可预览，行内显示原因。
- 目录名以 `dir/` 结尾；显示时使用 `/` 分段、缩进；不安全路径显示警告标记而不是隐藏。

### 8.5 二进制（binary）

- Worker 识别魔数并输出结构摘要：ELF/PE/Mach-O/Wasm/SQLite/PSD/ZIP/GZIP/BZIP2/XZ/ZSTD/7Z/RAR/ISO/DMG/Java class/Python pyc/TAR/OOXML/ODF。
- 文本摘要行由本地化 key + 动态数值组成；不拼接未校验的原始文件字符串。
- 字符串扫描：ASCII/UTF-8 可打印连续 ≥4 的运行，最多 256 条、每条 ≤128 字符；结果按文本渲染。
- 主线程十六进制：从 `content.data` 直接格式化前 1 MiB，8 KiB 一页；偏移列 + 十六进制 + ASCII；页码控件；超过 1 MiB 显示“仅检查前 1 MiB”。
- 不解析可执行代码、不加载 Wasm、不查 SQLite 内容。

## 9. UI 与本地化

- 命名空间：`resourcePreview`；字典 `zh`、`en`（其余语言回退英文）。键覆盖：viewer 标题、加载、错误、超限、加密、bomb、unsafe、字体元数据标签、字节数格式、页控件、条目选择、媒体错误。
- 布局：正文使用 `data-resource-preview="media|image|font|archive|binary"` 和状态属性；内部滚动容器通过 `scrollportRef` 交给 preview owner。
- 颜色只用 `--dsw-alias-*` / `--dsw-radius-*` 主题 token；不写死颜色值。
- 归档列表：左侧条目表（名称/大小/类型），右侧选中项；容器宽度 ≤560px 时上下堆叠（container query）。列表 ≤4096 行，用 `content-visibility: auto` 或分页（每页 200 行）+ 页码，避免 4096 个重型节点。V1 用简单分页，不做树折叠。
- 字体样张：元数据卡片 + 三档字号 + 本地化样张；没有字体时可输入? 不，只展示固定样张。
- 二进制：摘要卡片 + 十六进制表格 + 页控件 + 字符串列表（折叠）。
- 媒体：原生控件，不叠加自定义播放器。
- 无障碍：所有按钮有本地化 `aria-label`；错误用 `role="alert"`；焦点可见；不自动获取焦点。
- 空状态：文件内容为 0 字节 / 损坏解析时显示原因，不显示无限 spinner。
- 插件元数据（`locale/*.json` 的 `meta.title/description`）更新为“资源地址兼容 + 多格式预览”，说明 Worker 解析、支持格式和“不执行文件内容”。

## 10. 构建与打包

```
plugins/dsh-resource-url-compat/
  client.js                 # 构建产物（入口）
  client.media.js           # 构建产物（chunk）
  client.image.js
  client.font.js
  client.archive.js
  client.binary.js
  src/
    entry.jsx               # URL 补丁 + 注册 + runtime
    runtime/pool.js
    runtime/chunks.js
    runtime/cache.js
    runtime/limits.js
    runtime/path.js
    runtime/sniff.js
    locales.js
    media/body.jsx
    image/body.jsx
    font/body.jsx
    archive/body.jsx
    binary/body.jsx
    workers/{archive,font,binary}.js
    workers/pure/{zip,tar,sfnt,binary,media,path-safety}.js
  scripts/build.mjs         # Vite 构建 + 禁止 API 扫描 + 体积预算
  scripts/serve-fixtures.mjs（可选，仅本地验证）
  tests/*.test.mjs          # node --test
  docs/DESIGN.md
```

- `scripts/build.mjs` 用 Vite 8 的 Node `build` API（`configFile: false`，不加载仓库配置）：
  - `src/entry.jsx` → `client.js`，CJS library，`minify: true`，`target: 'chrome100'`；`react`、`react/jsx-runtime`、`react-dom`、`@deepseek-ai/dsh-client-ui-primitives` 标为 external。
  - 每个 `src/<family>/entry.jsx` → `client.<family>.js`，同样 CJS，作为 chunk 用 `chunk: 'client.<family>.js'` 注册。
  - worker 入口先用 Vite 打成 IIFE（`format: 'iife'`，`write: false` 取 code），把 code 通过 `define` 注入对应 chunk；不生成额外运行时文件，也不进入源码树。
  - 包装为 `window.__ModuleLoader__.load({ id, chunk?, factory(require) { const module={exports:{}}; const exports=module.exports; ...; return module.exports } })`；CJS 产物的 `require("react")` 由 factory 参数解析。
  - V1 不生成 source map（包装会改变行号）；调试时用未压缩构建。若后续需要 map，单独生成带包装偏移的 map。
- 构建后 `scripts/build.mjs --verify` 扫描全部产物：
  - 禁止 token：`dangerouslySetInnerHTML`、`innerHTML=`、`outerHTML=`、`insertAdjacentHTML`、`document.write`、`eval(`、`new Function`、`importScripts`、`fetch(`、`XMLHttpRequest`、`WebSocket`、`EventSource`。
  - 每个 chunk 必须含 `chunk:` 注册；入口不得静态引用 chunk。
  - 体积预算：入口 ≤ 48 KiB minified；每个 chunk ≤ 96 KiB minified（含 worker source）。超过失败并报告。
- `package.json`：`files` 加入 `client.*.js`；`scripts.build` 指向上面的构建；`dsh.client.inject` 加入内置预览包名（信息性依赖边）。运行时依赖不新增。
- **chunk 修订戳**：Host 的客户端修订来自 `client.js` 的 mtime/ctime/大小，chunk URL 复用 owner 修订。构建结束必须重写 `client.js` 末尾的构建戳注释（内容为 chunks 的 SHA-1，等长），保证仅改 chunk 时也会得到新的 owner 修订，否则浏览器会用不可变缓存命中旧 chunk。`plugin_manager` 的 `set_plugin` 重组合会触发 HMR。
- 产物不手工编辑；源码是唯一来源。构建失败时不得部署半成品。

## 11. 验证计划

### 单元测试（Node `node --test`，纯逻辑）

- `tests/zip.test.mjs`：EOCD/central directory、zip64、加密位、unsupported method、声明大小/压缩比、路径清洗、流式解压上限（用 Node `zlib` 造的小样本）。
- `tests/tar.test.mjs`：ustar prefix、GNU/PAX longname、header 边界、条目上限、路径安全。
- `tests/sfnt.test.mjs`：TTF/OTF/WOFF 名称解析、WOFF2 目录、表越界、记录上限。
- `tests/binary.test.mjs`：各魔数、ELF/PE/Wasm/SQLite/PSD 头、字符串上限、十六进制页。
- `tests/pool.test.mjs`：假 Worker 下的并发上限、队列满、超时、取消、卸载、worker 复用禁止/终止。
- `tests/formats.test.mjs`：后缀覆盖不重复、`binaryExtensions ⊆ extensions`、默认候选顺序、不覆盖内置格式。
- `tests/static.test.mjs`：构建产物禁止 token 扫描（与构建脚本同一实现）。

### 浏览器验证（chrome-devtools，当前桌面 Chromium）

验收以当前连接的桌面 Chromium 为准；它能覆盖全部原生路径。旧 Android WebView 的旧引擎本次没有设备，只有在你能提供真机/模拟器时才追加；否则报告“旧 WebView 未实测”，不把桌面通过当成旧内核通过。所有缺失能力分支由单元测试覆盖（假 Worker、假 DecompressionStream、无 FontFace）。

1. 构建 → 在插件行 `set_plugin` 上触发 HMR 或刷新页面。
2. 在仓库放样本 fixtures（不提交）：ZIP（文本+PNG+目录+加密条目）、TAR、TAR.GZ、GZ、TTF/WOFF2（复用 `apps/web/dist/assets/fonts`）、WAV、MP4（若 ffmpeg 可用）、AVIF（若工具可用）、WASM、SQLite（若工具可用）、损坏的 ZIP、超限 ZIP、随机字节 `.zip`。
3. 从 **Workspace files** 分别打开每个文件，断言：viewer 默认选中、正文出现、无 `resourceUnavailable`、无新网络请求（媒体/字体 Blob 除外）、console 无错误。
4. 失败/边界：损坏文件显示本地化原因；超限文件显示上限提示；切换到 viewer 下拉的 Binary 能看到结构；关闭 tab 后无 Worker 活动（可用 `performance`/worker 计数间接验证），切换 tab 不出现迟到结果。
5. 媒体：`<video>` 显示控件、不自动播放、错误码文案正确；Blob URL 在关闭后释放（devtools Memory 不易断言，检查 `blob:` 引用不增长）。
6. 字体：样张使用该字体，关闭后 `document.fonts` 不保留 face。
7. UI：亮/暗主题、390px 宽度、右侧栏窄宽度、键盘可达、无横向溢出；中英文切换。
8. 插件卸载/禁用后：URL getter 恢复、预览注册消失、无 `data-resource-preview` DOM 残留；重新启用后恢复。

### 静态/手工检查

- `node scripts/build.mjs --verify` 通过。
- `node --test tests/*.test.mjs` 通过。
- `git diff --check`（如果最终纳入 git）与文件末尾单换行。
- 不运行仓库全量测试；本次不改 `packages/`，不需要 `test:coverage`/`build:check`。

## 12. 风险与已知限制

- 浏览器对 MOV/MKV/AVI/WMV/HEIC/TIFF 的原生支持因内核而异；本扩展提供错误说明和 Binary 退路，不保证每个内核都能播放/解码。
- Blob 播放需要先把完整文件读入内存（Host 32 MiB 上限）；大视频开始播放前有等待。后续若要流式，需要 Host `/api/file` Range 支持。
- WOFF2 只显示目录级元数据；不引 Brotli 解码器。
- 归档不提供任意解压/保存；只支持文本和常见图片的有限内联预览。
- 十六进制只检查前 1 MiB；不在本版本提供任意偏移跳转。
- 结果缓存以 `content.data` 对象为键；同一内容的新 Uint8Array（reload）会重新解析，这是正确性优先的选择。
- 本地插件不参与仓库覆盖率门；单元测试覆盖纯解析器与池，UI 由浏览器验证覆盖。
- 失败 chunk 加载可重试，但构建产物缺失/路由 404 仍需要重新构建/刷新。

## 13. 留给实现者的决定

- 具体断点/上限是否再收紧（例如归档总解压从 64 MiB 降到 32 MiB），以实测内存为准，但不得放宽安全不变量。
- 归档列表是“分页 200 行”还是“虚拟滚动”；两者都满足有界 DOM，先选实现更简单且可测的分页。
- 字体样张文案、二进制摘要的展示顺序、归档列宽等纯视觉细节。
- 是否为本地 bundle 增加一个原创 SVG 图标；非本设计必需，沿用通用图标也可。
