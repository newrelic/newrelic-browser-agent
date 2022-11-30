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

  .boolean('d')
  .alias('d', 'dev')
  .describe('d', 'Instructs to check the dev folder instead of the root folder')
  .default('d', false)

  .string('pr')
  .describe('pr', 'PR name (bucket name) to search')
  .default('')

  .boolean('m')
  .alias('m', 'maps')
  .describe('m', 'Check for map files')
  .default('m', false)

  .help('h')
  .alias('h', 'help')
  .strict()
  .wrap(Math.min(110, yargs.terminalWidth()))
  .argv


const buildDir = path.resolve(__dirname, '../../build/')
const builtFileNames = fs.readdirSync(buildDir).filter(x => !config.m ? !x.endsWith('.map') : x )
const version = getVersionFromFilenames(builtFileNames)
var errors = []

validate()

async function validate() {
  var checks = []
  for (var filename of builtFileNames) {
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
    if (parts.length === 2 && parts[1] === 'js') prev.add(parts[0].split("-")[parts[0].split("-").length - 1])
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

function validateResponse(url, res, body) {
  if (config.exists === 'yes') {
    if (res.statusCode !== 200) {
      errors.push(url + ' does not exist, ' + res.statusCode)
      return
    }
    if (body.length === 0) {
      errors.push(`body for ${url} was empty`)
    }
  } else if (config.exists === 'no') {
    if (res.statusCode === 200) {
      errors.push(url + ' exists, ' + res.statusCode)
    }
  }
}

function getFile(filename) {
  var url = 'https://js-agent.newrelic.com/'
  if (config.d) url += 'dev'
  else if (config.pr) url += 'pr/' + config.pr
  url += '/' + filename
  var opts = {
    uri: url,
    method: 'GET',
    gzip: true
  }


  console.log('checking ', url)

  return new Promise((resolve, reject) => {
    request(opts, (err, res, body) => {
      if (err) {
        reject(err)
        return
      }
      resolve([url, res, body])
    })
  })
}