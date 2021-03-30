#!/usr/bin/env node

var yargs = require('yargs')
var test = require('tape')
var request = require('request')

var config = require('yargs')
  .usage('$0 [options]')

  .string('l')
  .alias('l', 'loaders')
  .describe('l', 'Comma-seprated list of loader variants to check')
  .default('l', 'rum,full')

  .string('v')
  .alias('v', 'version')
  .describe('v', 'Version to check, defaults to current')
  .default('v', 'current')

  .help('h')
  .alias('h', 'help')
  .strict()
  .wrap(Math.min(110, yargs.terminalWidth()))
  .argv

var loaderURLs = getLoaderURLs(config)
loaderURLs.forEach(function (loaderURL) { verifyLoader(loaderURL) })

function verifyLoader (loaderURL) {
  test('loader at ' + loaderURL, function (t) {
    var opts = {
      uri: loaderURL,
      method: 'GET',
      gzip: true
    }
    request(opts, function (err, res, body) {
      if (err) {
        t.fail(err)
        t.end()
      }

      sanityCheckResponse(t, res, body, 'loader at ' + loaderURL)

      if (config.version !== 'current') {
        var versionQuery = config.version + '.'
        t.ok(res.body.match(versionQuery), 'loader contained version string "' + versionQuery + '"')
      }

      var regex = /agent:\s*['"]([^'"]+)['"]/
      var match = regex.exec(res.body)
      var payloadURL = 'https://' + match[1]
      t.ok(payloadURL, 'found referenced payload URL as ' + payloadURL)

      var opts = {
        uri: payloadURL,
        method: 'GET',
        gzip: true
      }

      request(opts, function (err, res, body) {
        if (err) {
          t.fail(err)
          t.end()
        }

        sanityCheckResponse(t, res, body, 'payload for ' + loaderURL)
        t.end()
      })
    })
  })

  function sanityCheckResponse (t, res, body, label) {
    t.equal(res.statusCode, 200, 'got status ' + res.statusCode + ' for ' + label)
    t.equal(res.headers['content-type'], 'application/javascript', 'got content-type = ' + res.headers['content-type'] + ' for ' + label)
    t.equal(res.headers['content-encoding'], 'gzip', label + ' was served compressed')
    t.ok(body.length > 0, label + ' was ' + body.length + ' bytes')
  }
}

function getLoaderURLs (config) {
  var filenames = []
  config.loaders.split(/\s*,\s*/).forEach(function (loaderName) {
    var baseURL = 'https://js-agent.newrelic.com/nr-loader-' + loaderName + '-' + config.version
    filenames.push(baseURL + '.js')
    filenames.push(baseURL + '.min.js')
  })
  return filenames
}
