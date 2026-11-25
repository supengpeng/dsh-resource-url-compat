/** Fixed safety limits and the worker concurrency budget. */

const MiB = 1024 * 1024

/** Security limits shared by the main thread and every parser Worker. */
export const LIMITS = Object.freeze({
  fileBytes: 32 * MiB,
  maxEntries: 4096,
  maxEntryBytes: 16 * MiB,
  maxExtractedBytes: 64 * MiB,
  maxCompressionRatio: 200,
  maxTextEntryBytes: 4 * MiB,
  maxImageEntryBytes: 8 * MiB,
  maxPathChars: 1024,
  maxFontTables: 4096,
  maxFontNameRecords: 4096,
  maxFontNameBytes: 4096,
  maxFontNameTableBytes: 64 * 1024,
  maxBinaryScanBytes: 1 * MiB,
  maxBinaryStrings: 256,
  maxBinaryStringLength: 128,
  hexPageBytes: 8 * 1024,
  maxImagePixels: 16 * MiB,
  maxImageDimension: 16384,
  maxStringPageRows: 512,
})

/**
 * Resolve the worker budget from browser hints.
 * @param {{ hardwareConcurrency?: number, deviceMemory?: number }} [navigatorLike] - navigator or a test double.
 * @returns {{ maxWorkers: number, maxBytes: number, maxQueue: number }} the pool budget.
 */
export function poolBudget(navigatorLike = globalThis.navigator) {
  const hardware = Number.isFinite(navigatorLike?.hardwareConcurrency)
    && navigatorLike.hardwareConcurrency > 0
    ? navigatorLike.hardwareConcurrency
    : 4
  const lowMemory = Number.isFinite(navigatorLike?.deviceMemory) && navigatorLike.deviceMemory <= 2
  return {
    maxWorkers: lowMemory ? 1 : Math.min(4, Math.max(1, hardware - 1)),
    maxBytes: (lowMemory ? 32 : 64) * MiB,
    maxQueue: 12,
  }
}
