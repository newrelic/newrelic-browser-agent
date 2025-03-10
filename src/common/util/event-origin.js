/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
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
