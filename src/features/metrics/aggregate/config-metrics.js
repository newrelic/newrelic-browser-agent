/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/** init properties that are not reported as config. Feature flags are reported by name elsewhere. */
const SKIPPED_TOP_LEVEL_KEYS = ['feature_flags']

/**
 * @param {*} value
 * @returns {boolean} Whether the value is a plain object that should be walked into.
 */
const isPlainObject = (value) => !!value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype

/**
 * Compares a config value to its default. Arrays are compared by content, everything else by identity.
 * @param {*} value
 * @param {*} defaultValue
 * @returns {boolean} Whether the two are equivalent.
 */
const isSame = (value, defaultValue) => {
  if (Array.isArray(value) && Array.isArray(defaultValue)) return JSON.stringify(value) === JSON.stringify(defaultValue)
  return value === defaultValue
}

/**
 * Walks the init object and produces a supportability metric tag for each setting, named by its path in init
 * (e.g. `init.session_replay.collect_fonts` -> `Config/session_replay/collect_fonts/Enabled`).
 * - Booleans are reported as `Enabled` only when true, so the question answered is "how many customers have X enabled". Absence means disabled.
 * - Anything else is reported as `Changed` only when it differs from the default. The value itself is never included, as it may be
 *   customer data such as selectors, urls, domains, or obfuscation rules.
 * Which of these tags are surfaced is decided by the downstream tag list, so new init settings need no changes here.
 * @param {import('../../../common/config/init-types').Init} init The customer's merged init object.
 * @param {import('../../../common/config/init-types').Init} defaults A default init object to compare against.
 * @param {string[]} [path] The keys walked so far. Used for recursion.
 * @returns {string[]} The supportability metric tags.
 */
export function evaluateConfig (init, defaults, path = []) {
  const tags = []
  try {
    Object.keys(init).forEach(key => {
      if (!path.length && SKIPPED_TOP_LEVEL_KEYS.includes(key)) return
      const value = init[key]
      const defaultValue = defaults?.[key]
      const keyPath = [...path, key]
      if (typeof value === 'boolean') {
        if (value) tags.push(`Config/${keyPath.join('/')}/Enabled`)
      } else if (isPlainObject(value)) tags.push(...evaluateConfig(value, defaultValue, keyPath))
      else if (!isSame(value, defaultValue)) tags.push(`Config/${keyPath.join('/')}/Changed`)
    })
  } catch (err) {
    // failed to evaluate config... ignore
  }
  return tags
}
