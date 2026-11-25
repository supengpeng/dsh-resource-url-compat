# Release checklist

The package is an installable DSH bundle, not a standalone app. It has no runtime npm dependencies and ships prebuilt Client chunks.

## Before publishing

```sh
pnpm test
pnpm verify
pnpm exec publint .
npm pack --dry-run
npm publish --dry-run
```

Inspect the pack file list: it must contain `client*.js`, `icon.svg`, `docs/DETAIL*`, `docs/preview.svg`, `locale/*.json`, and `cordis.patch.yml`, and must not contain `test-fixtures/`, internal design/plan files, or a `.tgz`.

`publint` reports one warning for `./client`: the browser loader requires a CJS factory in `client.js` while the Host entry is ESM, so the package cannot use the suggested `.cjs` rename without breaking the DSH client module route. The shipped client packages use the same layout; keep this warning unless the loader changes.

## Publish

```sh
npm publish --access public
```

The package name `dsh-resource-url-compat` must remain unscoped for the `dsh plugin add dsh-resource-url-compat` command in the README. If a scoped name is chosen, update `package.json`, `cordis.patch.yml`, `scripts/build.mjs`, and `src/runtime/formats.js`, rebuild, and reinstall the bundle.

## Verify a published version

```sh
npm view dsh-resource-url-compat version
dsh plugin --profile web add dsh-resource-url-compat
```

Open a WAV, TTF, ZIP, and WASM file from **Workspace files**; each should render through the corresponding viewer. Then open the bundle details in **Plugins** and check the title, description, icon, and detail image in both supplied locales.
