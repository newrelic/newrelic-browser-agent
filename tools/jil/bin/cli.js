#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var path = module.require('path')
var require = module.require('es6-require')(module, null, path.resolve(__dirname, '../../..'))

require('../runner')
