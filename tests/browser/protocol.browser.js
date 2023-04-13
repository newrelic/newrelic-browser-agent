/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var jil = require('../../tools/jil/driver/browser.js')
import { isFileProtocol } from '../../src/common/url/protocol'
import { setScope, resetScope } from '../../src/common/util/global-scope'

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
  setScope({ location: fileLocation })

  t.ok(isFileProtocol(), 'Returned true when protocol is file protocol')

  resetScope()

  t.ok(!isFileProtocol(), 'Returned false when protocol is not file protocol')
  t.end()
})
