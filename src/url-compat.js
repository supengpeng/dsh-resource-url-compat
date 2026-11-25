/**
 * Browser-side repair for Chromium builds that leave a non-special scheme's
 * hostname in the pathname. This is the bundle's original compatibility fix,
 * kept independent from the preview registrations so it activates before any
 * Client service is available.
 */

/** Scheme every DSH resource address uses, as the URL parser normalizes it. */
const RESOURCE_PROTOCOL = 'dsh-resource:'
/** Address whose host the older parser leaves in pathname. */
const PROBE = 'dsh-resource://file/probe.txt'

/**
 * Read the authority an older parser leaves in the pathname.
 * @param {URL} url - a parsed URL.
 * @returns {string} the authority (`file` for `dsh-resource://file/...`), or empty.
 */
export function opaqueAuthority(url) {
  const match = /^\/\/([^/]*)/.exec(url.pathname)
  return match === null ? '' : match[1]
}

/**
 * Whether this engine needs the compatibility getters.
 * @returns {boolean} true when a `dsh-resource:` address has no native hostname.
 */
export function needsHostnamePatch() {
  try {
    const probe = new URL(PROBE)
    return probe.protocol === RESOURCE_PROTOCOL
      && probe.hostname === ''
      && opaqueAuthority(probe) === 'file'
  } catch {
    // A parser that rejects the address cannot be repaired by getters.
    return false
  }
}

/**
 * Patch one prototype accessor while the native value stays empty for
 * resource addresses.
 * @param {PropertyDescriptor} descriptor - the original accessor descriptor.
 * @param {() => string} native - its original getter.
 * @returns {PropertyDescriptor} the patched descriptor.
 */
export function patchedDescriptor(descriptor, native) {
  return {
    ...descriptor,
    get() {
      const value = native.call(this)
      if (value !== '' || this.protocol !== RESOURCE_PROTOCOL) return value
      return opaqueAuthority(this)
    },
  }
}

/**
 * Install the getter repair for this browser and dispose it with the fiber.
 * @param {import('@deepseek-ai/cordis').Context} ctx - the Client plugin context.
 * @returns {void}
 */
export function applyUrlCompat(ctx) {
  if (!needsHostnamePatch()) return
  const hostname = Object.getOwnPropertyDescriptor(URL.prototype, 'hostname')
  const host = Object.getOwnPropertyDescriptor(URL.prototype, 'host')
  if (hostname === undefined || host === undefined
    || hostname.get === undefined || host.get === undefined
    || hostname.configurable !== true || host.configurable !== true) return
  const patchedHostname = patchedDescriptor(hostname, hostname.get)
  const patchedHost = patchedDescriptor(host, host.get)
  Object.defineProperty(URL.prototype, 'hostname', patchedHostname)
  Object.defineProperty(URL.prototype, 'host', patchedHost)
  ctx.effect(() => () => {
    const currentHostname = Object.getOwnPropertyDescriptor(URL.prototype, 'hostname')
    const currentHost = Object.getOwnPropertyDescriptor(URL.prototype, 'host')
    if (currentHostname !== undefined && currentHostname.get === patchedHostname.get) {
      Object.defineProperty(URL.prototype, 'hostname', hostname)
    }
    if (currentHost !== undefined && currentHost.get === patchedHost.get) {
      Object.defineProperty(URL.prototype, 'host', host)
    }
  }, 'dsh-resource-url-compat: URL host getters')
  ctx.logger.info('dsh-resource-url-compat: repaired dsh-resource:// host parsing for this browser')
}
