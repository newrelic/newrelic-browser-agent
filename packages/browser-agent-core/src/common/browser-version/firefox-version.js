/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-useless-escape */

export var ffVersion = 0
var match = navigator.userAgent.match(/Firefox[\/\s](\d+\.\d+)/)
if (match) ffVersion = +match[1]
