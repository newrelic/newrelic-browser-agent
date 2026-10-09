/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Small pure helpers for working with registry tags. They live apart from lib.js on purpose: lib.js loads the JavaScript parser (`acorn`,
 * a dev dependency), and the pull request comment script must run in CI with plain `node` and nothing installed.
 */

/** Stands in for any part of an emitted metric name that cannot be known statically, and shapes compare on it. */
const WILDCARD = '<*>'

/**
 * @param {string} text A registry tag or an emitted pattern.
 * @returns {string} The text with every `<placeholder>` replaced by the same marker, so dynamic shapes can be compared.
 */
const shapeOf = (text) => text.replace(/<[^>]*>/g, WILDCARD)

/**
 * @param {string} text A registry tag or an emitted pattern.
 * @returns {RegExp} Matches any concrete metric name the text describes.
 */
function toRegExp (text) {
  const escaped = text.split(/<[^>]*>/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+')
  return new RegExp('^' + escaped + '$')
}

/**
 * @param {import('./registry-types').RegistryEntry} entry A registry entry.
 * @returns {Array<{tag: string, description: string}>} The entry, with its placeholder expanded for each known value.
 */
function expandEntry (entry) {
  if (!entry.values) return [{ tag: entry.tag, description: entry.description }]
  return entry.values.map(value => {
    const [v, description] = Array.isArray(value) ? value : [value]
    return {
      tag: entry.tag.replace(/<[^>]*>/, v),
      description: description || (entry.valueDescription ? entry.valueDescription.replace(/<v>/g, v) : entry.description)
    }
  })
}

module.exports = { WILDCARD, shapeOf, toRegExp, expandEntry }
