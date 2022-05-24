/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { mapOwn } from './map-own'
import { ee } from '../event-emitter/contextual-ee'
import { drain } from '../drain/drain'

// var mapOwn = require('map-own')
// var ee = require('ee')
// var drain = require('./drain')

export function activateFeatures (flags) {
  if (!(flags && typeof flags === 'object')) return
  mapOwn(flags, function (flag, val) {
    if (!val || activatedFeatures[flag]) return
    ee.emit('feat-' + flag, [])
    activatedFeatures[flag] = true
  })

  // if this is going to be used, should use the instanced EE?
  drain('feature')
}

export const activatedFeatures = {}
