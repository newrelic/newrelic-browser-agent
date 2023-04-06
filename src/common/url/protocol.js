/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../util/global-scope'

export function isFileProtocol () {
  return Boolean(globalScope?.location?.protocol === 'file:')
}
