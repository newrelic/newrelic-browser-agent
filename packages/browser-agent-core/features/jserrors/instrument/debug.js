/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ee } from '../../../common/event-emitter/contextual-ee'
import { mapOwn } from '../../../common/util/map-own'

var flags = {}
var flagArr

try {
  flagArr = localStorage.getItem('__nr_flags').split(',')
  if (console && typeof console.log === 'function') {
    flags.console = true
    if (flagArr.indexOf('dev') !== -1) flags.dev = true
    if (flagArr.indexOf('nr_dev') !== -1) flags.nrDev = true
  }
} catch (err) {
  // no op
}

if (flags.nrDev) ee.on('internal-error', function (err) { log(err.stack) })
if (flags.dev) ee.on('fn-err', function (args, origThis, err) { log(err.stack) })
if (flags.dev) {
  log('NR AGENT IN DEVELOPMENT MODE')
  log('flags: ' + mapOwn(flags, function (key, val) { return key }).join(', '))
}

function log(message) {
  try {
    if (flags.console) log(message)
  } catch (err) {
    // no op
  }
}
