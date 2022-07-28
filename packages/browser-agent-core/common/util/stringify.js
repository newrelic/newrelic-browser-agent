/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {mapOwn} from './map-own'
import {ee} from '../event-emitter/contextual-ee'

var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g // eslint-disable-line
var meta = {
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
  '"': '\\"',
  '\\': '\\\\'
}

export function stringify (val) {
  try {
    return str('', {'': val})
  } catch (e) {
    try {
      ee.emit('internal-error', [e])
    } catch (err) {
      // do nothing
    }
  }
}

function quote (string) {
  escapable.lastIndex = 0
  return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
    var c = meta[a]
    return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4)
  }) + '"' : '"' + string + '"'
}

function str (key, holder) {
  var value = holder[key]

  switch (typeof value) {
    case 'string':
      return quote(value)
    case 'number':
      return isFinite(value) ? String(value) : 'null'
    case 'boolean':
      return String(value)
    case 'object':
      if (!value) { return 'null' }
      var partial = []

      // The value is an array. Stringify every element. Use null as a placeholder
      // for non-JSON values.
      if (value instanceof window.Array || Object.prototype.toString.apply(value) === '[object Array]') {
        var length = value.length
        for (var i = 0; i < length; i += 1) {
          partial[i] = str(i, value) || 'null'
        }

        return partial.length === 0 ? '[]' : '[' + partial.join(',') + ']'
      }

      mapOwn(value, function (k) {
        var v = str(k, value)
        if (v) partial.push(quote(k) + ':' + v)
      })

      return partial.length === 0 ? '{}' : '{' + partial.join(',') + '}'
  }
}
