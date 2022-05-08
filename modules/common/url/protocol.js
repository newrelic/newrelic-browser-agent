/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getWindow } from '../window/win'
import { recordSupportability } from '../metrics/metrics'

var protocol = {
  isFileProtocol: isFileProtocol,
  supportabilityMetricSent: false
}

module.exports = protocol

if (isFileProtocol()) {
  recordSupportability('Generic/FileProtocol/Detected')
  protocol.supportabilityMetricSent = true
}

function isFileProtocol () {
  var win = getWindow()
  return !!(win.location && win.location.protocol && win.location.protocol === 'file:')
}
