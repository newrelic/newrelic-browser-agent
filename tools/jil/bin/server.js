#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const config = require('../runner/args')

if (!config.timeout) config.timeout = 32000
if (!config.port) config.port = 3333
config.cache = false

const driver = require('../index')

driver.ready(function () {
  console.log('asset server: http://' + config.host + ':' + driver.assetServer.assetServer.port)
  console.log('cors server: http://' + config.host + ':' + driver.assetServer.corsServer.port)
  console.log('bam server: http://' + config.host + ':' + driver.assetServer.bamServer.port)
  console.log('command server: http://' + config.host + ':' + driver.assetServer.commandServer.port)
})
