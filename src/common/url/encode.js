/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { stringify } from '../util/stringify'

// Characters that are safe in a qs, but get encoded.
var charMap = {
  '%2C': ',',
  '%3A': ':',
  '%2F': '/',
  '%40': '@',
  '%24': '$',
  '%3B': ';'
}

var charList = Object.keys(charMap)
var safeEncoded = new RegExp(charList.join('|'), 'g')

function real (c) {
  return charMap[c]
}

// Encode as URI Component, then unescape anything that is ok in the
// query string position.
export function qs (value) {
  if (value === null || value === undefined) return 'null'
  return encodeURIComponent(value).replace(safeEncoded, real)
}

export function fromArray (qs, maxBytes) {
  var bytes = 0
  for (var i = 0; i < qs.length; i++) {
    bytes += qs[i].length
    if (bytes > maxBytes) return qs.slice(0, i).join('')
  }
  return qs.join('')
}

export function obj (payload, maxBytes) {
  var total = 0
  var result = ''

  Object.entries(payload || {}).forEach(([feature, dataArray]) => {
    var intermediate = []
    var next
    var i

    if (typeof dataArray === 'string' || (!Array.isArray(dataArray) && dataArray !== null && dataArray !== undefined && dataArray.toString().length)) {
      next = '&' + feature + '=' + qs(dataArray)
      total += next.length
      result += next
    } else if (Array.isArray(dataArray) && dataArray.length) {
      total += 9
      for (i = 0; i < dataArray.length; i++) {
        next = qs(stringify(dataArray[i]))
        total += next.length
        if (typeof maxBytes !== 'undefined' && total >= maxBytes) break
        intermediate.push(next)
      }
      result += '&' + feature + '=%5B' + intermediate.join(',') + '%5D'
    }
  })
  return result
}

// Constructs an HTTP parameter to add to the BAM router URL
export function param (name, value, base = {}) {
  if (Object.keys(base).includes(name)) return '' // we assume if feature supplied a matching qp to the base, we should honor what the feature sent over the default
  if (value && typeof (value) === 'string') {
    return '&' + name + '=' + qs(value)
  }
  return ''
}
