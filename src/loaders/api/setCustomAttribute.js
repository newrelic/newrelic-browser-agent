/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { warn } from '../../common/util/console'
import { SET_CUSTOM_ATTRIBUTE } from './constants'
import { setupAPI, appendJsAttribute } from './sharedHandlers'

export function setupSetCustomAttributeAPI (agent) {
  setupAPI(SET_CUSTOM_ATTRIBUTE, function (name, value, persistAttribute = false) {
    if (typeof name !== 'string') {
      warn(39, typeof name)
      return
    }
    if (!(['string', 'number', 'boolean'].includes(typeof value) || value === null)) {
      warn(40, typeof value)
      return
    }
    return appendJsAttribute(agent, name, value, SET_CUSTOM_ATTRIBUTE, persistAttribute)
  }, agent)
}
