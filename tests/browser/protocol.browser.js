/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var jil = require('jil')

const matcher = require('jil/util/browser-matcher')
let supported = matcher.withFeature('obfuscate')

var fileLocation = {
  hash: '',
  host: '',
  hostname: '',
  href: 'file:///Users/jporter/Documents/Code/test.html',
  origin: 'file://',
  pathname: '/Users/jporter/Documents/Code/test.html',
  port: '',
  protocol: 'file:'
}

jil.browserTest('isFileProtocol returns coorectly when detecting file protocol', supported, function (t) {
  const win = require('../../agent/win')
  win.setWindow({ ...win.getWindow(), location: { ...fileLocation } })

  const protocol = require('../../agent/protocol')
  t.ok(protocol.isFileProtocol(), 'Returned false when protocol is not file protocol')
  t.ok(protocol.supportabilityMetricSent, 'isFileProtocol should send supportability metric if file protocol is detected')
  win.resetWindow()

  t.ok(!protocol.isFileProtocol(), 'Returned false when protocol is not file protocol')
  t.end()
})
