/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getWindow } from '../window/win'

export const protocol = {
  isFileProtocol: isFileProtocol,
  supportabilityMetricSent: false
}

function isFileProtocol () {
  var win = getWindow()
  return !!(win.location && win.location.protocol && win.location.protocol === 'file:')
}
