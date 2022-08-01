#!/usr/bin/env node

/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var yargs = require('yargs')
var request = require('request')
var path = require('path')
var fs = require('fs')

var config = require('yargs')
  .usage('$0 [options]')

  .string('e')
  .alias('e', 'exists')
  .describe('e', 'Fails when set to yes and scripts do not exist or when set to no and scripts do exist.')
  .default('e', 'yes,no')

  .help('h')
  .alias('h', 'help')
  .strict()
  .wrap(Math.min(110, yargs.terminalWidth()))
  .argv

const buildDir = path.resolve(__dirname, '../../build/')
const builtFileNames = fs.readdirSync(buildDir)
const version = getVersionFromFilenames(builtFileNames)
var errors = []

validate()

async function validate() {
  var checks = []
  for (var filename of builtFileNames) {
    console.log('checking ', filename)
    checks.push(getFile(filename))
  }
  var results = await Promise.all(checks)
  results.forEach(([filename, res, body]) => {
    validateResponse(filename, res, body)
  })

  checkErrorsAndExit()
}

function getVersionFromFilenames(fileNames){
  return Array.from(fileNames.reduce((prev, next) => {
    const parts = next.split(".")
    if (parts.length === 2 && parts[1] === 'js') prev.add(parts[0].split("-").at(-1))
    return prev
  }, new Set()))[0]
}

function checkErrorsAndExit() {
  if (errors.length > 0) {
    console.log('Validation failed:', errors)
    process.exit(1)
  } else {
    console.log('Validation was successful.')
    process.exit(0)
  }
}

function validateResponse(filename, res, body) {
  if (config.exists === 'yes') {
    if (res.statusCode !== 200) {
      errors.push(filename + ' does not exist, ' + res.statusCode)
      return
    }
    if (body.length === 0) {
      errors.push(`body for ${filename} was empty`)
    }
  } else if (config.exists === 'no') {
    if (res.statusCode === 200) {
      errors.push(filename + ' exists, ' + res.statusCode)
    }
  }
}

function getFile(filename) {
  var url = 'https://js-agent.newrelic.com/' + filename
  var opts = {
    uri: url,
    method: 'GET',
    gzip: true
  }

  return new Promise((resolve, reject) => {
    request(opts, (err, res, body) => {
      if (err) {
        reject(err)
        return
      }
      resolve([filename, res, body])
    })
  })
}
