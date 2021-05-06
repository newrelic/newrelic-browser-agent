/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Turn on feature
var loader = require('loader')

if (loader.disabled) return
loader.features.ins = true
