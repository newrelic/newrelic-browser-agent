/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var xhrload = new XMLHttpRequest()
xhrload.onload = function goodxhr () {
  window.xhrFired = true
  throw new Error('xhr onload')
}
xhrload.open('GET', '/bogus')
xhrload.send()
