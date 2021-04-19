/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var mapOwn = require('map-own')
var ee = require('ee')
var drain = require('./drain')

module.exports = function activateFeatures (flags) {
  if (!(flags && typeof flags === 'object')) return
  mapOwn(flags, function (flag, val) {
    if (!val || activatedFeatures[flag]) return
    ee.emit('feat-' + flag, [])
    activatedFeatures[flag] = true
  })

  drain('feature')
}

var activatedFeatures = module.exports.active = {}
