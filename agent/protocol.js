/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var getWindow = require('./win').getWindow
var metrics = require('metrics')

var protocol = {
  isFileProtocol: isFileProtocol,
  supportabilityMetricSent: false
}

module.exports = protocol

if (isFileProtocol()) {
  metrics.recordSupportability('Generic/FileProtocol/Detected')
  protocol.supportabilityMetricSent = true
}

function isFileProtocol () {
  var win = getWindow()
  return !!(win.location && win.location.protocol && win.location.protocol === 'file:')
}
