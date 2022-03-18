/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Turn on feature
import { runtime } from '../../../common/config/config'

export function initialize() {
    if (!runtime.disabled) runtime.features.ins = true
}
