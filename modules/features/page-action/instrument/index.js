/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Turn on feature
import { getRuntime } from '../../../common/config/config'

export function initialize() {
  if (!getRuntime().disabled) getRuntime().features.ins = true
}
