/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
  generateUuid: generateUuid,
  generateSpanId: generateSpanId,
  generateTraceId: generateTraceId
}

function generateUuid () {
  var randomVals = null
  var rvIndex = 0
  var crypto = window.crypto || window.msCrypto
  if (crypto && crypto.getRandomValues) {
    randomVals = crypto.getRandomValues(new Uint8Array(31))
  }

  function getRandomValue () {
    if (randomVals) {
      // same as % 16
      return randomVals[rvIndex++] & 15
    } else {
      return Math.random() * 16 | 0
    }
  }

  // v4 UUID
  var template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  var id = ''
  var c
  for (var i = 0; i < template.length; i++) {
    c = template[i]
    if (c === 'x') {
      id += getRandomValue().toString(16)
    } else if (c === 'y') {
      // this is the uuid variant per spec (8, 9, a, b)
      // % 4, then shift to get values 8-11
      c = getRandomValue() & 0x3 | 0x8
      id += c.toString(16)
    } else {
      id += c
    }
  }

  return id
}

// 16-character hex string (per DT spec)
function generateSpanId () {
  return generateRandomHexString(16)
}

// 32-character hex string (per DT spec)
function generateTraceId() {
  return generateRandomHexString(32)
}

function generateRandomHexString(length) {
  var randomVals = null
  var rvIndex = 0
  var crypto = window.crypto || window.msCrypto
  if (crypto && crypto.getRandomValues && Uint8Array) {
    randomVals = crypto.getRandomValues(new Uint8Array(length))
  }

  var chars = []
  for (var i = 0; i < length; i++) {
    chars.push(getRandomValue().toString(16))
  }
  return chars.join('')

  function getRandomValue () {
    if (randomVals) {
      // same as % 16
      return randomVals[rvIndex++] & 15
    } else {
      return Math.random() * 16 | 0
    }
  }
}
