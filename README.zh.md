# 资源地址兼容与多格式预览

面向 Web 客户端的 DeepSeek Harness（DSH）组合包。它修复旧版 Chromium 对 `dsh-resource://` 地址的解析，让文件预览、图片以及其他基于资源地址的视图重新可用；同时为内置预览不支持的格式增加原生优先的预览。

## 故障现象

在部分旧版 Chromium（包括部分安卓浏览器使用的 WebView 内核）中，非标准协议的 URL 会把主机名留在路径里。具体受影响版本并不一致；本机没有旧 WebView 可供验证。在当前桌面 Chromium 上探测会直接通过，插件不会改动原生 getter：

```text
new URL('dsh-resource://file/session/s//w/a.md')
  hostname  ''                         （新版 Chromium：'file'）
  pathname  '//file/session/s//w/a.md' （新版 Chromium：'/session/s//w/a.md'）
```

DSH 客户端的资源注册表用 `URL.hostname` 判断资源协议。hostname 为空时，地址会被当作普通导航地址而不是资源，工作区文件标签因此返回 `none`，预览显示“文件资源服务不可用”。文件树仍然正常，是因为目录列表直接调用 `workspaceFiles` 远程命名空间。

## 修复方式

插件的浏览器半启动时先探测一次。只有当地址的协议是 `dsh-resource:` 且原生 `hostname` 为空时，才为 `URL.prototype.hostname` 和 `URL.prototype.host` 安装 getter，从 `pathname` 中取出主机名——这正是新版 Chromium 返回的值。插件卸载时通过 `ctx.effect` 恢复原始描述符。现代 Chromium 探测通过，不会做任何修改。

无需配置：安装组合包后刷新页面即可。预览出现在同一个“工作区文件”侧栏；浏览器缺少必要能力时会显示本地化原因，而不是空白面板。

## 多格式预览

浏览器半在內置文件预览提供 `documentPreviews` 与侧栏文档 slot 之后，注册五个额外预览族：

| 族 | 格式 | 渲染 |
|---|---|---|
| 媒体 | MP4/M4V/MOV/WebM/MKV/OGV/AVI/FLV/WMV；MP3/WAV/FLAC/OGG/OGA/M4A/AAC/OPUS/WMA | 原生 `<video>`/`<audio>`，用魔数嗅探 MIME |
| 图片 | AVIF/TIFF/HEIC/HEIF | 浏览器原生解码，限制像素总量 |
| 字体 | TTF/OTF/WOFF/WOFF2 | `FontFace` 字样 + Worker 解析 sfnt 元数据 |
| 压缩包 | ZIP/JAR/TAR/GZ/TGZ/TAR.GZ | 有界中央目录/TAR 解析；单条目用原生 `DecompressionStream` |
| 二进制 | WASM/EXE/DLL/SO/SQLite/PSD/7Z/RAR 以及其他不支持的后缀 | 只读结构标记、可打印字符串、分页十六进制 |

内置预览继续负责文本、Markdown、代码、PDF、Office、表格和 HTML。扩展渲染器是额外的查看器选项；原生解码失败时可在查看器菜单中选择“二进制”。

### 安全与上限

- 每个解析任务使用一次性 Worker；最多 4 个并发（低内存设备 1）、64 MiB 在飞（低内存设备 32 MiB）、12 个排队、8 秒超时。
- ZIP/TAR 条目上限 4096，单条解压 16 MiB，总解压 64 MiB，压缩比 200:1；条目名只按文本显示，不安全路径会被标记。
- 图片像素上限 16,777,216；二进制只扫描前 1 MiB；十六进制每页 8 KiB。
- 文件内容永远不会变成 HTML 或 JavaScript；不发起网络请求，不用 `eval`/`new Function`；对象 URL、字体、Worker、定时器和监听器随预览清理。
- 预览结果按借用的字节对象缓存；文件重新加载会重新解析，不会读到旧结果。

## 安装

从 npm 安装已发布的组合包：

```sh
dsh plugin --profile web add dsh-resource-url-compat
```

也可以从本地目录安装：

```sh
dsh plugin --profile web add /path/to/dsh-resource-url-compat
```

也可以在 Web 界面的 **Plugins → 添加插件** 里选择该包目录。安装后开关默认打开，刷新页面。插件行会出现在 profile 的 `dsh.profile.bundles` 列表。

## 验证

在右侧边栏打开 **工作区文件（Workspace files）**，点击一个文本文件。预览应显示文件内容，而不是 `resourceUnavailable`，并且该标签会请求 `/api/workspaceFiles/stat`。在现代桌面浏览器上，插件加载后不会修改任何 getter。预览样本见 `docs/TESTING.md`；维护者发布检查见 `RELEASE.md`。

## 范围

URL 补丁只覆盖 `dsh-resource:` 地址，其他非标准协议保持浏览器原行为。预览是现有工作区文件服务之上的客户端渲染器，不改变 Host 文件 API。长期的上游 URL 修法是让 `packages/client/resources/src/client/resources.ts` 的 `protocolOf()` 直接从地址字符串读取协议和 authority，而不是依赖 `URL.hostname`。
