# Local testing

## Unit tests and build

```sh
node --test plugins/dsh-resource-url-compat/tests/*.test.mjs
node plugins/dsh-resource-url-compat/scripts/build.mjs --verify
```

The build scans the generated artifacts for forbidden content APIs and raw control characters. Unit tests cover path safety, media/image mapping, sfnt metadata, ZIP/TAR parsing, binary magic, hex pages, Worker scheduling, validation, and the format table.

## Browser fixtures

Generate fixtures (untracked) under `plugins/dsh-resource-url-compat/test-fixtures/` with `scripts/make-fixtures.py`, then open them from **Workspace files** in the right Sidebar. Expected results:

- `sample.wav` — native audio player, size and duration.
- `sample.ttf` / `sample.woff2` — font family metadata and a rendered specimen.
- `sample.zip` — three entries; text and image entries preview; `bomb.zip` shows the unsafe-ratio message; `corrupt.zip` shows the invalid message.
- `sample.tar`, `sample.tar.gz`, `sample.txt.gz` — two entries for the TAR containers and a text preview for the single gzip file.
- `sample.avif` — native image with dimensions.
- `sample.wasm`, `sample.sqlite` — format, structure tokens, strings, and hex.

A current desktop Chromium is the acceptance browser. Old Android WebView verification is not available on this host; capability fallbacks for missing Worker, `DecompressionStream`, and `FontFace` are unit-tested and must be reported as unverified on real old engines.

## Package checks

```sh
pnpm test
pnpm verify
pnpm exec publint .
npm pack --dry-run
npm publish --dry-run
```

The pack must include the Client chunks, icon, locale files, detail image, and patch, and must exclude `test-fixtures/` and internal design/plan files. `publint` keeps the client CJS warning explained in `RELEASE.md`.
