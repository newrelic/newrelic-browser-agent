/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { stringify } from '../util/stringify'

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

  function addString (str, obfuscate = true) {
    if (typeof str === 'undefined' || str === '') return ''
    str = obfuscate ? (obfuscator?.obfuscateString(String(str)) ?? String(str)) : String(str)
    str = truncator?.(str) ?? str
    if (hasOwnProp.call(stringTable, str)) {
      return numeric(stringTable[str], true)
    } else {
      stringTable[str] = stringTableIdx++
      return quoteString(str)
    }
  }
}

/**
 * Attributes are serialized according to their types, using the provided serializers.  Only the first 64 attributes will be added to the payload.
 * @param attrs
 * @param serializers
 * @param {function} serializers.addKey -function for serializing attribute keys
 * @param {function} serializers.addVal - function for serializing attribute values
 * @returns {*[]}
 */
export function addCustomAttributes (attrs, serializers) {
  const { addKey, addVal } = serializers
  var attrParts = []

  Object.entries(attrs || {}).forEach(([key, val]) => {
    if (attrParts.length >= MAX_ATTRIBUTES) return
    var type = 5
    var serializedValue
    // add key to string table first
    key = addKey(key)

    switch (typeof val) {
      case 'object':
        if (val) {
          // serialize objects to strings
          serializedValue = addVal(stringify(val))
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
        serializedValue = addVal(val)
    }

    attrParts.push([type, key + (serializedValue ? ',' + serializedValue : '')])
  })

  return attrParts
}

var escapable = /([,\\;])/g

function quoteString (str) {
  return "'" + str.replace(escapable, '\\$1')
}
