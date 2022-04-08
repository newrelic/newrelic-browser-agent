/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
var getWindow = require('./win').getWindow

module.exports = { isFileProtocol: isFileProtocol }

function isFileProtocol () {
  var win = getWindow()
  return !!(win.location && win.location.protocol && win.location.protocol === 'file:')
}
