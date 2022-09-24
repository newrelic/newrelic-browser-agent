#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var config = require('../runner/args')
var setSauceBrowsers = require('../util/sauce-browsers')
setSauceBrowsers(!config.P).then(() => {require('../runner')})
