/**
 * Host half of the DSH resource URL compatibility bundle.
 *
 * The failure is a browser parser difference, so the whole repair lives in the
 * Client half. This empty Host plugin keeps the bundle a normal Loader row
 * whose Client half is discovered from the package's `dsh.client` declaration.
 */
export function apply() {}
