/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = protocolAllowed

function protocolAllowed (location) {
  return !!(location && location.protocol && location.protocol !== 'file:')
}
