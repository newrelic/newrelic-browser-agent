/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var jil = require('jil')
import * as win from '../../dist/packages/browser-agent-core/src/common/window/win'
import { protocol } from '../../dist/packages/browser-agent-core/src/common/url/protocol'

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

jil.browserTest('isFileProtocol returns coorectly when detecting file protocol', function (t) {
  win.setWindowOrWorkerGlobScope({ ...win.getWindowOrWorkerGlobScope(), location: { ...fileLocation } })

  t.ok(protocol.isFileProtocol(), 'Returned false when protocol is not file protocol')
  t.ok(protocol.supportabilityMetricSent, 'isFileProtocol should send supportability metric if file protocol is detected')
  win.resetWindowOrWorkerGlobScope()

  t.ok(!protocol.isFileProtocol(), 'Returned false when protocol is not file protocol')
  t.end()
})
