/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { stringify } from '../util/stringify'
import { isPureObject } from '../util/type-check'

var hasOwnProp = Object.prototype.hasOwnProperty
var MAX_ATTRIBUTES = 64

export function nullable (val, fn, comma) {
  return val || val === 0 || val === ''
    ? fn(val) + (comma ? ',' : '')
    : '!'
}

export function numeric (n, noDefault) {
  if (noDefault) {
    return Math.floor(n).toString(36)
  }
  return (n === undefined || n === 0) ? '' : Math.floor(n).toString(36)
}

export function getAddStringContext (obfuscator, truncator) {
  let stringTableIdx = 0
  const stringTable = Object.prototype.hasOwnProperty.call(Object, 'create') ? Object.create(null) : {}

  return addString

  function addString (str, opts = {}) {
    const { obfuscate = true, truncate = true } = opts
    if (typeof str === 'undefined' || str === '') return ''
    str = String(str)
    if (obfuscate) str = obfuscator?.obfuscateString(str) ?? str
    if (truncate) str = truncator?.(str) ?? str
    if (hasOwnProp.call(stringTable, str)) {
      return numeric(stringTable[str], true)
    } else {
      stringTable[str] = stringTableIdx++
      return quoteString(str)
    }
  }
}

export function addCustomAttributes (attrs, addString, obfuscator) {
  var attrParts = []

  Object.entries(attrs || {}).forEach(([key, val]) => {
    if (attrParts.length >= MAX_ATTRIBUTES) return
    var type = 5
    var serializedValue
    // Attribute names should never be obfuscated or truncated.
    // Keep them in the shared string table for payload efficiency, but always serialize the raw key.
    key = addString(key, { obfuscate: false, truncate: false })

    switch (typeof val) {
      case 'object':
        if (val) {
          // serialize objects to strings after obfuscating only leaf values
          serializedValue = addString(stringify(obfuscateValueLeaves(val, obfuscator)), { obfuscate: false })
        } else {
          // null attribute type
          type = 9
        }
        break
      case 'number':
        type = 6
        // make sure numbers contain a `.` so they are parsed as doubles
        serializedValue = val % 1 ? val : val + '.'
        break
      case 'boolean':
        type = val ? 7 : 8
        break
      case 'undefined':
        // we treat undefined as a null attribute (since dirac does not have a concept of undefined)
        type = 9
        break
      default:
        serializedValue = addString(val)
    }

    attrParts.push([type, key + (serializedValue ? ',' + serializedValue : '')])
  })

  return attrParts
}

var escapable = /([,\\;])/g

function obfuscateValueLeaves (value, obfuscator, seen = new WeakSet()) {
  if (!obfuscator || value === null || value === undefined) return value
  if (typeof value === 'string') return obfuscator.obfuscateString(value)
  if (typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)

  if (Array.isArray(value)) return value.map(item => obfuscateValueLeaves(item, obfuscator, seen))
  if (!isPureObject(value)) return value

  return Object.entries(value).reduce((acc, [key, childValue]) => {
    acc[key] = obfuscateValueLeaves(childValue, obfuscator, seen)
    return acc
  }, {})
}

function quoteString (str) {
  return "'" + str.replace(escapable, '\\$1')
}
