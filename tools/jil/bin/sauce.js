#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var path = require('path')
var argv = require('yargs')
  .boolean('v')
  .alias('v', 'verbose')
  .describe('v', 'enable detailed debugging output from sauce-connect')
  .argv

var require = module.require('es6-require')(module, null, path.resolve(__dirname, '../../..'))
var externalServices = require('../util/external-services.es6')
var opts = { verbose: argv.verbose }

externalServices.startSauce(opts, function (err) {
  if (err) {
    console.log(err)
    process.exit(-1)
  }

  console.log('sauce connect up')
})
