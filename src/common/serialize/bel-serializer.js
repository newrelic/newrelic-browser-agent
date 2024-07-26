/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { stringify } from '../util/stringify'
import { Obfuscator } from '../util/obfuscate'

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

export function getAddStringContext (agentIdentifier) {
  // eslint-disable-next-line
  var stringTable = Object.hasOwnProperty('create') ? Object.create(null) : {}
  var stringTableIdx = 0

  return addString

  function addString (str) {
    if (typeof str === 'undefined' || str === '') return ''
    var obfuscator = new Obfuscator({ agentIdentifier })
    str = String(str)
    if (obfuscator.shouldObfuscate()) str = obfuscator.obfuscateString(str)
    if (hasOwnProp.call(stringTable, str)) {
      return numeric(stringTable[str], true)
    } else {
      stringTable[str] = stringTableIdx++
      return quoteString(str)
    }
  }
}

export function addCustomAttributes (attrs, addString) {
  var attrParts = []

  Object.entries(attrs || {}).forEach(([key, val]) => {
    if (attrParts.length >= MAX_ATTRIBUTES) return
    var type = 5
    var serializedValue
    // add key to string table first
    key = addString(key)

    switch (typeof val) {
      case 'object':
        if (val) {
          // serialize objects to strings
          serializedValue = addString(stringify(val))
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

function quoteString (str) {
  return "'" + str.replace(escapable, '\\$1')
}
