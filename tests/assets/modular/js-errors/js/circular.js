/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var ouroboros = {}
ouroboros.ouroboros = ouroboros
var e = new Error('asdf'); e.message = ouroboros; throw e
