/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {(start: number, end: number) => void} RecordManifestScriptWindowFn - Widens the live scriptStart/
 * scriptEnd window with one manifest script asset's DOM correlation timing. `start`/`end` are that asset's
 * `correlation.script.start`/`.end`, or falsy if not yet resolved. See `findScriptTimings`, which registers the
 * concrete implementation, for the exact widening semantics (never shrinks either bound).
 */

/**
 * @typedef {Object} TimingsInternals
 * @property {Set<string>} weighedAssetUrls - Always present (seeded by `getOrCreateInternals`, see
 * `script-tracker.js`). Cleaned URLs already folded into `timings.totalWeight`/`timings.renderBlocking` by
 * `applyResourceWeight`, so the same underlying resource (e.g. a manifest asset that's also the .register calling
 * script itself) is never counted twice.
 * @property {RecordManifestScriptWindowFn} recordManifestScriptWindow - Always present (seeded by
 * `getOrCreateInternals`, see `script-tracker.js`). `findScriptTimings` overrides the seeded default with one that
 * folds into the live `scriptStart`/`scriptEnd` getters instead.
 */

export default {}
