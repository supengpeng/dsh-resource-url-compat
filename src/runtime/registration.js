/** Registration wiring for the five preview families. */

import { FAMILY_DEFINITIONS, definitionOf } from './formats.js'

/** Locale namespace owned by the preview bodies. */
export const NS = 'resourcePreview'

/**
 * Register every preview definition and its keyed body.
 * @param {object} scope - Cordis child scope with documentPreviews, slots, and locale.
 * @param {(family: object) => object} bodyFor - stable component factory for one family.
 * @param {(key: string) => string} t - bound locale translator.
 * @param {object} [runtime] - pool/chunk/cache/limits face injected into each body.
 * @returns {void}
 */
export function registerPreviews(scope, bodyFor, t, runtime) {
  for (const family of FAMILY_DEFINITIONS) {
    scope.effect(
      () => scope.documentPreviews.register(definitionOf(family, t)),
      `resource-preview: ${family.id} metadata`,
    )
    const Body = bodyFor(family)
    const inject = runtime === undefined ? undefined : () => ({ runtime })
    scope.effect(
      () => scope.slots.inject(
        'sidebar.right.tab.document',
        () => scope.slots.register({
          name: 'sidebar.right.tab.document',
          key: family.id,
          locale: NS,
          ...(inject === undefined ? {} : { inject }),
        }, Body),
      ),
      `resource-preview: ${family.id} body`,
    )
  }
}
