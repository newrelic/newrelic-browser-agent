/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var protocolAllowed = require('../../../loader/protocol-allowed')
if (!protocolAllowed(window.location)) return

// Turn on feature
require('loader').features.ins = true
