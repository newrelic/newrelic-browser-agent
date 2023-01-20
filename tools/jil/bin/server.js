#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var config = require('../runner/args')

if (!config.timeout) config.timeout = 32000
if (!config.port) config.port = 3333

config.cache = false

var driver = require('../index')

var hostname = config.host
// driver.router.handle(driver.assetServer.defaultAgentConfig.licenseKey, true)
// driver.assetServer.renderIndex = true

setTimeout(() => {
  console.log('asset server: http://' + hostname + ':' + driver.assetServer.assetServer.port)
  console.log('cors server: http://' + hostname + ':' + driver.assetServer.corsServer.port)
  console.log('bam server: http://' + hostname + ':' + driver.assetServer.bamServer.port)
}, 500);
