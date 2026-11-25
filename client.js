window.__ModuleLoader__.load({
  id: "dsh-resource-url-compat",
  factory(require) {
  const module = { exports: {} }
  const exports = module.exports
Object.defineProperty(exports,Symbol.toStringTag,{value:`Module`});let e=require("react"),t=require("react/jsx-runtime");var n=`dsh-resource:`,r=`dsh-resource://file/probe.txt`;function i(e){let t=/^\/\/([^/]*)/.exec(e.pathname);return t===null?``:t[1]}function a(){try{let e=new URL(r);return e.protocol===n&&e.hostname===``&&i(e)===`file`}catch{return!1}}function o(e,t){return{...e,get(){let e=t.call(this);return e!==``||this.protocol!==n?e:i(this)}}}function s(e){if(!a())return;let t=Object.getOwnPropertyDescriptor(URL.prototype,`hostname`),n=Object.getOwnPropertyDescriptor(URL.prototype,`host`);if(t===void 0||n===void 0||t.get===void 0||n.get===void 0||t.configurable!==!0||n.configurable!==!0)return;let r=o(t,t.get),i=o(n,n.get);Object.defineProperty(URL.prototype,"hostname",r),Object.defineProperty(URL.prototype,"host",i),e.effect(()=>()=>{let e=Object.getOwnPropertyDescriptor(URL.prototype,`hostname`),a=Object.getOwnPropertyDescriptor(URL.prototype,`host`);e!==void 0&&e.get===r.get&&Object.defineProperty(URL.prototype,"hostname",t),a!==void 0&&a.get===i.get&&Object.defineProperty(URL.prototype,"host",n)},`dsh-resource-url-compat: URL host getters`),e.logger.info(`dsh-resource-url-compat: repaired dsh-resource:// host parsing for this browser`)}var c={"viewer.media":`Media`,"viewer.image":`Image`,"viewer.font":`Font`,"viewer.archive":`Archive`,"viewer.binary":`Binary`,loading:`Loading…`,retry:`Retry`,chunkFailed:`The preview for this format could not be loaded.`,busy:`Too many files are being parsed. Close another preview and retry.`,decodeFailed:`This browser cannot decode this file.`,tooLarge:`This file is too large to preview.`,unsupported:`This format is not supported.`,encrypted:`Encrypted entries cannot be previewed.`,bomb:`This entry has an unsafe compression ratio.`,unsafePath:`Unsafe path`,truncated:`Only the first part of this file was inspected.`,timeout:`Parsing took too long.`,invalid:`The file is damaged or is not the declared format.`,empty:`This file is empty.`,contentUnavailable:`No readable content is available for this entry.`,viewerHint:`Choose Binary in the viewer menu to inspect the raw file.`,"size.bytes":`{value} B`,"size.kib":`{value} KiB`,"size.mib":`{value} MiB`,"size.gib":`{value} GiB`,"media.video":`Video`,"media.audio":`Audio`,"media.duration":`{value}`,"media.resolution":`{width} × {height}`,"media.error.aborted":`The browser stopped loading this media.`,"media.error.network":`The media could not be read.`,"media.error.decode":`The browser cannot decode this media.`,"media.error.unsupported":`This media container or codec is not supported by the browser.`,"media.error.unknown":`The media could not be played.`,"image.dimensions":`{width} × {height}`,"image.decodeFailed":`This browser cannot decode this image.`,"image.tooLarge":`This image is too large to preview.`,"font.family":`Family`,"font.subfamily":`Style`,"font.fullName":`Full name`,"font.version":`Version`,"font.unitsPerEm":`Units per em`,"font.ascender":`Ascender`,"font.descender":`Descender`,"font.weight":`Weight`,"font.glyphs":`Glyphs`,"font.axes":`Variable axes`,"font.tables":`Tables`,"font.sample":`Aa Bb Cc 0123 汉字`,"font.compressed":`Metadata only: this compressed font is rendered by the browser.`,"font.loadFailed":`The browser rejected this font.`,"font.unsupported":`This browser cannot render font specimens.`,"archive.entries":`{count} entries`,"archive.uncompressed":`Uncompressed`,"archive.compressed":`Compressed`,"archive.entry":`Entry`,"archive.directory":`Directory`,"archive.method":`Method`,"archive.encrypted":`Encrypted`,"archive.bomb":`Unsafe ratio`,"archive.unsafe":`Unsafe path`,"archive.empty":`This archive has no entries.`,"archive.selectEntry":`Select an entry to inspect it.`,"archive.page":`Page {page} / {pages}`,"archive.prev":`Previous page`,"archive.next":`Next page`,"archive.textPreview":`Text preview`,"archive.imagePreview":`Image preview`,"archive.unsupportedEntry":`Only text and common image entries can be previewed.`,"archive.previewTooLarge":`This entry is too large to preview.`,"archive.previewFailed":`This entry could not be read.`,"archive.root":`Archive`,"archive.name":`Name`,"archive.size":`Size`,"binary.format":`Format`,"binary.size":`Size`,"binary.strings":`Strings`,"binary.hex":`Hex`,"binary.offset":`Offset`,"binary.bytes":`Bytes`,"binary.truncated":`Only the first 1 MiB was inspected.`,"binary.noStrings":`No printable strings were found.`,"binary.summary":`Summary`,"binary.page":`Page {page} / {pages}`,"binary.prev":`Previous page`,"binary.next":`Next page`},l={"viewer.media":`媒体`,"viewer.image":`图片`,"viewer.font":`字体`,"viewer.archive":`压缩包`,"viewer.binary":`二进制`,loading:`正在加载…`,retry:`重试`,chunkFailed:`这个格式的预览组件加载失败。`,busy:`正在解析的文件太多，请关闭另一个预览后重试。`,decodeFailed:`这个浏览器无法解码此文件。`,tooLarge:`文件太大，无法预览。`,unsupported:`暂不支持这种格式。`,encrypted:`加密条目无法预览。`,bomb:`这个条目的压缩比不安全。`,unsafePath:`不安全的路径`,truncated:`只检查了文件的前一部分。`,timeout:`解析时间过长。`,invalid:`文件已损坏，或不是声明的格式。`,empty:`这个文件是空的。`,contentUnavailable:`这个条目没有可读内容。`,viewerHint:`可在查看器下拉菜单里选择“二进制”检查原始文件。`,"size.bytes":`{value} B`,"size.kib":`{value} KiB`,"size.mib":`{value} MiB`,"size.gib":`{value} GiB`,"media.video":`视频`,"media.audio":`音频`,"media.duration":`{value}`,"media.resolution":`{width} × {height}`,"media.error.aborted":`浏览器中止了媒体读取。`,"media.error.network":`无法读取媒体。`,"media.error.decode":`浏览器无法解码此媒体。`,"media.error.unsupported":`浏览器不支持此媒体容器或编码。`,"media.error.unknown":`无法播放此媒体。`,"image.dimensions":`{width} × {height}`,"image.decodeFailed":`这个浏览器无法解码这张图片。`,"image.tooLarge":`图片太大，无法预览。`,"font.family":`字体族`,"font.subfamily":`样式`,"font.fullName":`完整名称`,"font.version":`版本`,"font.unitsPerEm":`每 em 单位`,"font.ascender":`上伸部`,"font.descender":`下伸部`,"font.weight":`字重`,"font.glyphs":`字形数`,"font.axes":`可变轴`,"font.tables":`表`,"font.sample":`Aa Bb Cc 0123 汉字`,"font.compressed":`仅元数据：这个压缩字体由浏览器渲染。`,"font.loadFailed":`浏览器拒绝了这个字体。`,"font.unsupported":`这个浏览器无法渲染字体样张。`,"archive.entries":`{count} 个条目`,"archive.uncompressed":`解压后`,"archive.compressed":`压缩后`,"archive.entry":`条目`,"archive.directory":`目录`,"archive.method":`方式`,"archive.encrypted":`已加密`,"archive.bomb":`不安全压缩比`,"archive.unsafe":`不安全路径`,"archive.empty":`这个压缩包没有条目。`,"archive.selectEntry":`选择一个条目查看内容。`,"archive.page":`第 {page} / {pages} 页`,"archive.prev":`上一页`,"archive.next":`下一页`,"archive.textPreview":`文本预览`,"archive.imagePreview":`图片预览`,"archive.unsupportedEntry":`只能预览文本和常见图片条目。`,"archive.previewTooLarge":`这个条目太大，无法预览。`,"archive.previewFailed":`无法读取这个条目。`,"archive.root":`压缩包`,"archive.name":`名称`,"archive.size":`大小`,"binary.format":`格式`,"binary.size":`大小`,"binary.strings":`字符串`,"binary.hex":`十六进制`,"binary.offset":`偏移`,"binary.bytes":`字节`,"binary.truncated":`只检查了前 1 MiB。`,"binary.noStrings":`没有找到可打印字符串。`,"binary.summary":`摘要`,"binary.page":`第 {page} / {pages} 页`,"binary.prev":`上一页`,"binary.next":`下一页`};function u(){let e=new WeakMap;return{get(t,n){return e.get(t)?.get(n)},set(t,n,r){let i=e.get(t);i===void 0&&(i=new Map,e.set(t,i)),i.set(n,r)},clear(){e=new WeakMap}}}var d=/^client\.([A-Za-z0-9][A-Za-z0-9._-]*)\.js$/u;function f(e){let t=new Map;return{load(n){if(!d.test(n))return Promise.reject(Error(`resource-preview: invalid chunk ${JSON.stringify(n)}`));let r=t.get(n);if(r!==void 0)return r;let i=Promise.resolve(e.async(`./${n}`)).catch(e=>{throw t.get(n)===i&&t.delete(n),e});return t.set(n,i),i},clear(e){t.delete(e)},dispose(){t.clear()}}}var p=1048576,m=Object.freeze({fileBytes:32*p,maxEntries:4096,maxEntryBytes:16*p,maxExtractedBytes:64*p,maxCompressionRatio:200,maxTextEntryBytes:4*p,maxImageEntryBytes:8*p,maxPathChars:1024,maxFontTables:4096,maxFontNameRecords:4096,maxFontNameBytes:4096,maxFontNameTableBytes:65536,maxBinaryScanBytes:1*p,maxBinaryStrings:256,maxBinaryStringLength:128,hexPageBytes:8192,maxImagePixels:16*p,maxImageDimension:16384,maxStringPageRows:512});function h(e=globalThis.navigator){let t=Number.isFinite(e?.hardwareConcurrency)&&e.hardwareConcurrency>0?e.hardwareConcurrency:4,n=Number.isFinite(e?.deviceMemory)&&e.deviceMemory<=2;return{maxWorkers:n?1:Math.min(4,Math.max(1,t-1)),maxBytes:(n?32:64)*p,maxQueue:12}}var g=1048576;function _(e){let t=Error(`resource-preview: ${e}`);return t.code=e,t}function v({createWorker:e,maxWorkers:t=4,maxBytes:n=64*g,maxQueue:r=12,setTimeout:i=globalThis.setTimeout,clearTimeout:a=globalThis.clearTimeout}={}){if(typeof e!=`function`)throw TypeError(`resource-preview: createWorker is required`);let o=[],s=new Set,c=0,l=0,u=!1,d=(e,t)=>{e.state===`queued`&&(e.state=`settled`,e.abort!==null&&e.signal.removeEventListener(`abort`,e.abort),e.abort=null,e.reject(t))},f=()=>{if(u||c>=t)return;let e=o[0];e!==void 0&&(c>0&&l+e.weight>n||(o.shift(),h(e),c<t&&f()))},p=(e,t,n)=>{if(e.state===`settled`)return;e.state=`settled`,e.timer!==null&&a(e.timer),e.timer=null,e.abort!==null&&e.signal.removeEventListener(`abort`,e.abort),e.abort=null;let r=e.worker;if(r!==null){r.onmessage=null,r.onerror=null,r.onmessageerror=null;try{r.terminate()}catch{}e.worker=null}s.delete(e),--c,l-=e.weight,t===void 0?e.resolve(n):e.reject(t),f()},m=e=>t=>{let n=t?.data;if(typeof n!=`object`||!n||n.v!==1||typeof n.ok!=`boolean`){p(e,_(`invalid`));return}if(n.ok===!1){p(e,_(typeof n.code==`string`?n.code:`invalid`));return}let r=n.value;if(e.job.validate!==void 0)try{r=e.job.validate(r)}catch{p(e,_(`invalid`));return}p(e,void 0,r)},h=t=>{t.state=`running`,c+=1,l+=t.weight;let n;try{n=e(t.job.source)}catch{p(t,_(`invalid`));return}if(s.add(t),t.worker=n,n.onmessage=m(t),n.onerror=()=>{p(t,_(`invalid`))},n.onmessageerror=()=>{p(t,_(`invalid`))},t.signal?.aborted===!0){p(t,_(`aborted`));return}t.timer=i(()=>{p(t,_(`timeout`))},t.timeoutMs);try{let e={...t.job.payload},r=[...t.job.transfer??[]];e.bytes instanceof Uint8Array&&(e.bytes=e.bytes.slice(),r.unshift(e.bytes.buffer)),n.postMessage({v:1,...e},r)}catch{p(t,_(`invalid`))}};return{run:e=>new Promise((i,a)=>{if(u){a(_(`disposed`));return}if(typeof e!=`object`||!e||typeof e.source!=`string`||typeof e.payload!=`object`||e.payload===null){a(_(`invalid`));return}let s=e.payload.bytes,d=s instanceof Uint8Array?s.byteLength:0,m=Number.isFinite(e.timeoutMs)&&e.timeoutMs>0?e.timeoutMs:8e3;if(e.signal?.aborted===!0){a(_(`aborted`));return}let g={job:e,weight:d,timeoutMs:m,resolve:i,reject:a,state:`queued`,worker:null,timer:null,signal:e.signal,abort:null};if(e.signal!==void 0&&(g.abort=()=>{if(g.state===`queued`){let t=o.indexOf(g);t>=0&&o.splice(t,1),g.state=`settled`,e.signal.removeEventListener(`abort`,g.abort),a(_(`aborted`));return}g.state===`running`&&p(g,_(`aborted`))},e.signal.addEventListener(`abort`,g.abort,{once:!0}),e.signal.aborted)){g.abort();return}if(c<t&&(c===0||l+d<=n)&&o.length===0){h(g);return}if(o.length>=r){a(_(`busy`));return}o.push(g),f()}),dispose:()=>{if(!u){u=!0;for(let e of o.splice(0))d(e,_(`disposed`));for(let e of[...s])p(e,_(`disposed`))}},stats:()=>({active:c,activeBytes:l,queued:o.length})}}function y(e){let t=h(typeof navigator==`object`&&navigator!==null?navigator:void 0),n=typeof Worker==`function`&&typeof Blob==`function`&&typeof URL?.createObjectURL==`function`,r=f(e??{async:()=>Promise.reject(Error(`resource-preview: module loader unavailable`))}),i=u(),a=v({createWorker(e){if(!n)throw Error(`resource-preview: Worker is unavailable`);let t=URL.createObjectURL(new Blob([e],{type:`text/javascript`}));try{return new Worker(t,{name:`dsh-resource-preview`})}finally{URL.revokeObjectURL(t)}},maxWorkers:t.maxWorkers,maxBytes:t.maxBytes,maxQueue:t.maxQueue}),o=!1;return{pool:a,chunks:r,cache:i,limits:m,workerAvailable:n,dispose(){o||(o=!0,a.dispose(),r.dispose(),i.clear())}}}var b=`dsh-resource-url-compat`,x=[`mp4`,`m4v`,`mov`,`webm`,`mkv`,`ogv`,`avi`,`flv`,`wmv`,`mp3`,`wav`,`flac`,`ogg`,`oga`,`m4a`,`aac`,`opus`,`wma`],S=[`avif`,`tif`,`tiff`,`heic`,`heif`],C=[`ttf`,`otf`,`woff`,`woff2`],w=[`zip`,`jar`,`tar`,`gz`,`tgz`,`tar.gz`],T=`wasm.exe.dll.so.dylib.bin.o.class.pyc.sqlite.db.dmg.iso.img.psd.ai.sketch.bz2.xz.zst.7z.rar.eot.odt.ods.odp.pages.numbers`.split(`.`),E=[...x,...S,...C,...w,...T],D=[{id:`${b}/media`,chunk:`client.media.js`,extensions:x,binaryExtensions:x,titleKey:`viewer.media`},{id:`${b}/image`,chunk:`client.image.js`,extensions:S,binaryExtensions:S,titleKey:`viewer.image`},{id:`${b}/font`,chunk:`client.font.js`,extensions:C,binaryExtensions:C,titleKey:`viewer.font`},{id:`${b}/archive`,chunk:`client.archive.js`,extensions:w,binaryExtensions:w,titleKey:`viewer.archive`},{id:`${b}/binary`,chunk:`client.binary.js`,extensions:E,binaryExtensions:E,titleKey:`viewer.binary`}];function O(e,t){return{id:e.id,extensions:e.extensions,binaryExtensions:e.binaryExtensions,priority:`extension`,title:()=>t(e.titleKey),loading:`bytes-complete`}}var k=`resourcePreview`;function A(e,t,n,r){for(let i of D){e.effect(()=>e.documentPreviews.register(O(i,n)),`resource-preview: ${i.id} metadata`);let a=t(i),o=r===void 0?void 0:()=>({runtime:r});e.effect(()=>e.slots.inject(`sidebar.right.tab.document`,()=>e.slots.register({name:`sidebar.right.tab.document`,key:i.id,locale:k,...o===void 0?{}:{inject:o}},a)),`resource-preview: ${i.id} body`)}}var j=`
.dshrp-root {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  color: var(--dsw-alias-label-document-preview, var(--dsw-alias-label-primary));
  background: var(--dsw-alias-bg-document-preview, var(--dsw-alias-bg-base));
  font-family: var(--dsw-font, inherit);
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: 1.6;
  container-type: inline-size;
}
.dshrp-status {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 120px;
  padding: 24px;
  color: var(--dsw-alias-label-secondary);
  text-align: center;
}
.dshrp-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--dsw-alias-border-l3);
  border-top-color: var(--dsw-alias-label-secondary);
  border-radius: 50%;
  animation: dshrp-spin 0.8s linear infinite;
}
@keyframes dshrp-spin { to { transform: rotate(360deg); } }
.dshrp-error {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 120px;
  padding: 24px;
  text-align: center;
}
.dshrp-error-text { color: var(--dsw-alias-label-secondary); }
.dshrp-button {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  cursor: pointer;
  font: inherit;
}
.dshrp-button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshrp-button:focus-visible { outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 1px; }
.dshrp-muted { color: var(--dsw-alias-label-tertiary); }
.dshrp-mono { font-family: var(--dsw-font-mono, ui-monospace, monospace); }
.dshrp-panel {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
}
.dshrp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  font-size: 11px;
}
.dshrp-media-meta {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 0;
}
.dshrp-media-stage {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 12px 16px 16px;
  box-sizing: border-box;
}
.dshrp-media-stage video {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-2);
}
.dshrp-media-stage audio {
  width: min(100%, 560px);
}
.dshrp-image-stage {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 12px 16px 16px;
  box-sizing: border-box;
  overflow: auto;
}
.dshrp-image-stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--dsw-radius-md, 8px);
}
.dshrp-font-meta {
  display: grid;
  grid-template-columns: minmax(96px, auto) minmax(0, 1fr);
  gap: 4px 16px;
  padding: 12px 16px;
  color: var(--dsw-alias-label-secondary);
}
.dshrp-font-row { display: contents; }
.dshrp-font-row dt { font-size: 12px; }
.dshrp-font-row dd { margin: 0; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dshrp-font-block { display: flex; flex-direction: column; gap: 6px; padding: 0 16px 8px; }
.dshrp-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.dshrp-font-specimen {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  min-height: 160px;
  padding: 20px 16px 28px;
  border-top: 0.5px solid var(--dsw-alias-border-l3);
  overflow-wrap: anywhere;
}
.dshrp-font-specimen > div { font-size: 16px; }
.dshrp-font-small { font-size: 24px !important; }
.dshrp-font-large { font-size: 40px !important; }
.dshrp-archive-summary {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l3);
}
.dshrp-archive-body {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  min-width: 0;
  min-height: 0;
  gap: 0;
}
.dshrp-archive-list {
  display: flex;
  flex: 1 1 320px;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border-right: 0.5px solid var(--dsw-alias-border-l3);
}
.dshrp-archive-row {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 4px 12px;
  border: 0;
  color: var(--dsw-alias-label-primary);
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.dshrp-archive-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshrp-archive-row[aria-selected="true"] { background: var(--dsw-alias-bg-document-selection); }
.dshrp-archive-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--dsw-font-mono, ui-monospace, monospace);
  font-size: 12px;
}
.dshrp-archive-size { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dshrp-archive-flags { display: flex; flex: none; gap: 4px; }
.dshrp-archive-detail {
  display: flex;
  flex: 1 1 260px;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 12px 16px;
  box-sizing: border-box;
}
.dshrp-archive-text {
  flex: 1 1 auto;
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: var(--dsw-font-mono, ui-monospace, monospace);
  font-size: 12px;
}
.dshrp-archive-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  align-self: flex-start;
}
.dshrp-pager {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
}
.dshrp-binary-summary {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l3);
}
.dshrp-binary-body {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  min-width: 0;
  min-height: 0;
}
.dshrp-binary-strings {
  display: flex;
  flex: 0 1 280px;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 12px 16px;
  box-sizing: border-box;
  border-right: 0.5px solid var(--dsw-alias-border-l3);
}
.dshrp-binary-strings ul { margin: 0; padding-left: 18px; }
.dshrp-binary-strings li { overflow-wrap: anywhere; font-size: 11px; }
.dshrp-binary-hex {
  display: flex;
  flex: 1 1 360px;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 8px 16px 16px;
  box-sizing: border-box;
  font-family: var(--dsw-font-mono, ui-monospace, monospace);
  font-size: 11px;
  line-height: 1.5;
  white-space: nowrap;
}
.dshrp-hex-row { display: grid; grid-template-columns: 72px minmax(0, 1fr) 130px; gap: 12px; }
.dshrp-hex-offset { color: var(--dsw-alias-label-tertiary); }
.dshrp-hex-bytes { color: var(--dsw-alias-label-primary); }
.dshrp-hex-ascii { color: var(--dsw-alias-label-secondary); }
`;function M(){if(typeof document>`u`||typeof document.createElement!=`function`)return()=>{};let e=document.createElement(`style`);return e.dataset.resourcePreviewStyles=``,e.textContent=j,document.head.append(e),()=>{e.remove()}}var N;function P(e){N=e}var F={"client.media.js":`MediaBody`,"client.image.js":`ImageBody`,"client.font.js":`FontBody`,"client.archive.js":`ArchiveBody`,"client.binary.js":`BinaryBody`};function I(n,r){let i=e=>e;return function(a){let o=a.t??i,[s,c]=(0,e.useState)(0),[l,u]=(0,e.useState)({kind:`loading`,Body:void 0});return(0,e.useEffect)(()=>{let e=!0;return r===void 0?(u({kind:`error`}),()=>{e=!1}):(u({kind:`loading`,Body:void 0}),r.chunks.load(n.chunk).then(t=>{if(!e)return;let r=t?.[F[n.chunk]];if(typeof r!=`function`){u({kind:`error`});return}u({kind:`ready`,Body:r})},()=>{e&&u({kind:`error`})}),()=>{e=!1})},[s,r,n]),l.kind===`ready`?(0,e.createElement)(l.Body,{...a,runtime:r}):l.kind===`error`?(0,t.jsx)(`div`,{className:`dshrp-root`,"data-resource-preview":`chunk-error`,children:(0,t.jsxs)(`div`,{className:`dshrp-error`,role:`alert`,children:[(0,t.jsx)(`span`,{className:`dshrp-error-text`,children:o(`chunkFailed`)}),(0,t.jsx)(`button`,{type:`button`,className:`dshrp-button`,"data-resource-preview-retry":!0,onClick:()=>{r?.chunks.clear(n.chunk),c(e=>e+1)},children:o(`retry`)})]})}):(0,t.jsx)(`div`,{className:`dshrp-root`,"data-resource-preview":`loading`,children:(0,t.jsxs)(`div`,{className:`dshrp-status`,role:`status`,children:[(0,t.jsx)(`span`,{className:`dshrp-spinner`,"aria-hidden":`true`}),(0,t.jsx)(`span`,{children:o(`loading`)})]})})}}function L(e){s(e),e.inject([`documentPreviews`,`slots`,`locale`],e=>{let t=e.locale.bind(k),n=y(N);e.effect(()=>()=>n.dispose(),`resource-preview: runtime`),e.effect(()=>e.locale.register(k,{zh:l,en:c}),`resource-preview: dictionaries`),e.effect(()=>M(),`resource-preview: styles`),A(e,e=>I(e,n),t,n)})}var R=[];exports.apply=L,exports.inject=R,exports.setRequire=P;
  if (typeof module.exports.setRequire === "function") module.exports.setRequire(require)
  return module.exports
  },
})
/* resource-preview-build:2d45a68af736a72196a4cccbf236ba2527466e70 */
