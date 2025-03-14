/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns a string representing the origin of an event target. Used by SessionTrace and PageViewTiming features to assign a "better" target to events
 * @param {*} t The target to derive the origin from.
 * @param {*} [target] A known target to compare to. If supplied, and a derived origin could not be reached, this will be referenced.
 * @param {*} [ee] An event emitter instance to use for context retrieval, which only applies to XMLHttpRequests.
 * @returns {string} The derived origin of the event target.
 */
export function eventOrigin (t, target, ee) {
  let origin = 'unknown'

  if (t && t instanceof XMLHttpRequest) {
    const params = ee.context(t).params
    if (!params || !params.status || !params.method || !params.host || !params.pathname) return 'xhrOriginMissing'
    origin = params.status + ' ' + params.method + ': ' + params.host + params.pathname
  } else if (t && typeof (t.tagName) === 'string') {
    origin = t.tagName.toLowerCase()
    if (t.id) origin += '#' + t.id
    if (t.className) {
      for (let i = 0; i < t.classList.length; i++) origin += '.' + t.classList[i]
    }
  }

  if (origin === 'unknown') {
    if (typeof target === 'string') origin = target
    else if (target === document) origin = 'document'
    else if (target === window) origin = 'window'
    else if (target instanceof FileReader) origin = 'FileReader'
  }

  return origin
}
