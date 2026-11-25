/** Scoped stylesheet installed once for every resource-preview body. */

export const STYLES = `
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
`

/**
 * Install the preview stylesheet and return its remover.
 * @returns {() => void} removes the style element when called.
 */
export function installStyles() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return () => {}
  const style = document.createElement('style')
  style.dataset.resourcePreviewStyles = ''
  style.textContent = STYLES
  document.head.append(style)
  return () => { style.remove() }
}
