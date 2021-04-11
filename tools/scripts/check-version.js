#!/usr/bin/env node

var yargs = require('yargs')
var request = require('request')

var config = require('yargs')
  .usage('$0 [options]')

  .string('e')
  .alias('e', 'exists')
  .describe('e', 'Fails when set to yes and scripts do not exist or when set to no and scripts do exist.')
  .default('e', 'yes,no')

  .string('v')
  .alias('v', 'version')
  .describe('v', 'Version to check, defaults to current')
  .default('v', 'current')

  .help('h')
  .alias('h', 'help')
  .strict()
  .wrap(Math.min(110, yargs.terminalWidth()))
  .argv

var filenames = getLoaderFilenames(['rum', 'full', 'spa'], config.version)
filenames = filenames.concat(getAggregatorFilenames(config.version))
var errors = []

validate()

async function validate() {
  var checks = []
  for (var filename of filenames) {
    console.log('checking ', filename)
    checks.push(getFile(filename))
  }
  var results = await Promise.all(checks)
  results.forEach(([filename, res, body]) => {
    validateResponse(filename, res, body)
  })

  checkErrorsAndExit()
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
    if (!res.body.match(config.version + '.')) {
      errors.push(`${filename} does not contain version ${config.version}`)
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

function getLoaderFilenames(loaders, version) {
  var filenames = []
  loaders.forEach(function (loaderName) {
    var base = 'nr-loader-' + loaderName + '-' + version
    filenames.push(base + '.js')
    filenames.push(base + '.min.js')
  })
  return filenames
}

function getAggregatorFilenames(version) {
  var filenames = []
  filenames.push('nr-' + version + '.js')
  filenames.push('nr-' + version + '.min.js')
  filenames.push('nr-spa-' + version + '.js')
  filenames.push('nr-spa-' + version + '.min.js')
  return filenames
}
