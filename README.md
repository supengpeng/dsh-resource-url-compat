# Resource URL compatibility and previews

A DeepSeek Harness (DSH) bundle for Web clients whose Chromium core predates the WHATWG non-special-scheme host change. It repairs `dsh-resource://` address parsing so file previews, images, and every other resource-backed view can resolve their resource again, and adds native-first previews for files the built-in preview does not render.

## The failure

In some older Chromium builds, including WebView cores used by Android browsers, the URL parser leaves the host of a non-special scheme in the pathname. The exact affected versions vary; this host could not verify an old WebView. On a current desktop Chromium the probe succeeds and the plugin leaves the native getters untouched:

```text
new URL('dsh-resource://file/session/s//w/a.md')
  hostname  ''                         (current Chromium: 'file')
  pathname  '//file/session/s//w/a.md' (current Chromium: '/session/s//w/a.md')
```

The DSH Client resource registry names a resource's protocol with `URL.hostname`. With an empty hostname it treats the address as a navigation address instead of a resource, so a workspace file tab reports `none` and the preview shows “the file resource service is unavailable”. The Files tree still works because directory listing calls the `workspaceFiles` Remote namespace directly.

## The repair

The Client half installs getters on `URL.prototype.hostname` and `URL.prototype.host` only for addresses whose protocol is `dsh-resource:` and whose native hostname is empty. It derives the host from the authority the older parser left in `pathname`, which is exactly what current Chromium returns. The plugin restores the original descriptors when its fiber is disposed. On a browser that already parses the host, the probe succeeds and nothing is patched.

No configuration is needed: install the bundle and refresh the page. Previews appear in the same **Workspace files** sidebar; missing browser capabilities degrade to a localized explanation rather than a blank panel.

## Multi-format previews

The Client half registers five additional preview families after the built-in file preview exposes `documentPreviews` and the Sidebar document slot:

| Family | Formats | Renderer |
|---|---|---|
| Media | MP4/M4V/MOV/WebM/MKV/OGV/AVI/FLV/WMV; MP3/WAV/FLAC/OGG/OGA/M4A/AAC/OPUS/WMA | Native `<video>`/`<audio>` with magic-byte MIME sniffing |
| Image | AVIF/TIFF/HEIC/HEIF | Native image decode, pixel-capped |
| Font | TTF/OTF/WOFF/WOFF2 | `FontFace` specimen plus Worker sfnt metadata |
| Archive | ZIP/JAR/TAR/GZ/TGZ/TAR.GZ | Bounded central-directory/TAR parsing; native `DecompressionStream` for one entry |
| Binary | WASM/EXE/DLL/SO/SQLite/PSD/7Z/RAR and the rest of the unsupported binary suffixes | Read-only structure tokens, printable strings, paged hex |

The built-in preview keeps its own formats (text, Markdown, code, PDF, Office, spreadsheets, HTML). An extension registration is offered as an extra viewer choice; the viewer menu lets you switch to **Binary** when a native decode fails.

### Safety and limits

- Parsing runs in one disposable Worker per task; at most four tasks (one on low-memory devices), 64 MiB in flight (32 MiB on low-memory devices), 12 queued, 8 s timeout.
- ZIP/TAR entries are capped at 4096, single entries at 16 MiB, extracted totals at 64 MiB, compression ratio at 200:1; ZIP names are displayed as text only and unsafe paths are marked.
- Images are capped at 16,777,216 pixels; binaries are scanned for the first 1 MiB; hex pages are 8 KiB.
- File content never becomes HTML or JavaScript. No network request, `eval`, or `new Function`; object URLs, font faces, workers, timers, and listeners are released with the preview.
- Preview content is cached by the borrowed byte object, so reloading a file reparses it rather than serving a stale result.

## Install

From the npm registry, install the published bundle:

```sh
dsh plugin --profile web add dsh-resource-url-compat
```

From a local checkout, install the bundle directory instead:

```sh
dsh plugin --profile web add /path/to/dsh-resource-url-compat
```

Or use **Plugins → Add plugin** in the Web GUI and choose the package directory. The switch is on after installation; refresh the page. The plugin row appears in the profile's `dsh.profile.bundles` list.

## Verify

Open **Workspace files** in the right Sidebar and click a text file. The file preview renders its content instead of the `resourceUnavailable` line, and `/api/workspaceFiles/stat` is requested for the tab. On a modern desktop browser the bundle loads without changing any getters. For a preview sample, open a `.zip`, `.tar.gz`, `.wav`, `.ttf`, `.avif`, or `.wasm` file; see `docs/TESTING.md`.

## Scope

The URL patch covers `dsh-resource:` addresses only; other non-special schemes keep their engine behavior. Previews are Client-side renderers for the existing workspace file service; the Host filesystem API is unchanged. For a permanent upstream URL fix, `protocolOf()` in `packages/client/resources/src/client/resources.ts` can read the scheme and authority from the address string without asking `URL` for the hostname.
