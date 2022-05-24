/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var a = { handleEvent: function handleEvent () {
  window.removeEventListener('load', a, false)
  throw new Error('global addEventListener listener')
}}
window.addEventListener('load', a, false)

var b = {
  handleEvent: function handleEvent () {
    document.removeEventListener('readystatechange', b, false)
    throw new Error(this.message)
  }, message: 'document addEventListener listener'
}

document.addEventListener('readystatechange', b, false)

var c = { handleEvent: function handleEvent () {
  document.removeEventListener('readystatechange', c, false)
  throw new Error('THIS EVENT SHOULD HAVE BEEN REMOVED')
}}

document.addEventListener('readystatechange', c, false)
document.removeEventListener('readystatechange', c, false)
