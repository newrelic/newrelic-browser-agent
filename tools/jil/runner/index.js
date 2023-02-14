/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
const newrelic = require('newrelic')
const config = require('./args')
const path = require('path')
const resolve = require('path').resolve
const concat = require('concat-stream')
const browserList = require('../util/browser-list')
const Output = require('../output')
const os = require('os')
const glob = require('glob')
const Driver = require('../driver')
const loadBrowser = require('../loader/loadBrowser')
const { getSauceLabsCreds, startExternalServices, stopExternalServices } = require('../util/external-services')

const buildIdentifier = getBuildIdentifier()
const output = new Output(config)
const testDriver = new Driver(config, output)

module.exports = testDriver

process.on('unhandledRejection', (reason, p) => {
  newrelic.noticeError(reason, {
    build: buildIdentifier,
    'error.data': reason.data || null
  })
  console.log('Unhandled Rejection:')
  console.log(reason)
})

let tunnelIdentifier = process.env.USER + '@' + os.hostname()

let commandLineTestFiles = config._

let relativeMainFile = path.relative(__dirname, require.main.filename)
let launchedFromCli = (relativeMainFile === '../bin/cli.js')
let launchedFromJilServer = (relativeMainFile === '../bin/server.js')

if (launchedFromCli) {
  if (!process.stdin.isTTY) {
    process.stdin.pipe(concat((data) => {
      let filesFromStdin = data.toString('utf-8').split('\n').filter(Boolean)
      let testFiles = commandLineTestFiles.concat(filesFromStdin)

      if (testFiles.length === 0) {
        loadDefaultFiles(loadBrowsersAndRunTests)
      } else {
        loadFiles(testFiles, loadBrowsersAndRunTests)
      }
    }))
  } else if (commandLineTestFiles.length) {
    loadFiles(commandLineTestFiles, loadBrowsersAndRunTests)
  } else {
    loadDefaultFiles(loadBrowsersAndRunTests)
  }
} else if (launchedFromJilServer) {
  loadDefaultFiles()
} else {
  loadBrowsersAndRunTests()
}

function loadDefaultFiles (cb) {
  let globOpts = { cwd: path.resolve(__dirname, '../../..') }

  let fileGlob = 'tests/@(browser|functional)/**/*.@(browser|test).js'
  if (config.u) { fileGlob = 'tests/@(browser)/**/*.@(browser|test).js' }
  if (config.F) { fileGlob = 'tests/@(functional)/**/*.@(test).js' }

  glob(fileGlob, globOpts, (er, files) => {
    if (er) throw er
    loadFiles(files, cb)
  })
}

function loadFiles (testFiles, cb) {
  for (let file of testFiles) {
    file = resolve(process.cwd(), file)
    if (file.slice(-11) === '.browser.js') {
      let spec
      try {
        spec = require(file.replace('.browser.', '.spec.'))
      } catch (err) {
        // no spec exists for this file
      }
      loadBrowser(testDriver, file, undefined, spec) // queued for later (browserify)
    } else if (file.slice(-8) === '.test.js') {
      require(file)
    }
  }

  if (cb) cb()
}

function getBuildIdentifier () {
  let buildIdentifier = process.env.BUILD_NUMBER
  if (!buildIdentifier) {
    let identifier = Math.random().toString(16).slice(2)
    buildIdentifier = `${process.env.USER}-${identifier}`
  }
  return buildIdentifier
}

function loadBrowsersAndRunTests () {
  let browsers = browserList(config.browsers)
  if (!browsers || browsers.length === 0) {
    console.log('No browsers matched: ' + config.browsers)
    return process.exit(1)
  }

  startExternalServices(browsers, config, runTests)

  function runTests (err) {
    if (err) throw err
    for (let browser of browsers) {
      makeChild(browser)
    }

    testDriver.run(function () {
      stopExternalServices()
      process.exit(0)
    })
  }

  function makeChild (browser) {
    let desired = browser.desired
    let connectionInfo = {}

    desired['tunnel-identifier'] = tunnelIdentifier

    if (config.seleniumServer) {
      connectionInfo = `http://${config.seleniumServer}/wd/hub`
    } else {
      let sauceCreds = getSauceLabsCreds()
      connectionInfo = `http://${sauceCreds.username}:${sauceCreds.accessKey}@ondemand.saucelabs.com/wd/hub`
    }

    if (browser.allowsExtendedDebugging()) desired.extendedDebugging = true // turn on JS console logs & HAR files in SauceLabs

    desired.build = buildIdentifier
    desired.name = `${buildIdentifier}-${browser.toString()}`

    // Whether the session should accept all SSL certs by default.
    // https://github.com/SeleniumHQ/selenium/wiki/DesiredCapabilities
    desired.acceptSslCerts = true

    // Firefox requires this capability in order to accept self-signed certificates
    // https://developer.mozilla.org/en-US/docs/Web/WebDriver/Capabilities/acceptInsecureCerts
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1103196
    if (!desired.hasOwnProperty('acceptInsecureCerts')) {
      desired.acceptInsecureCerts = true
    }

    // test duration no longer than GC timeout
    desired.maxDuration = 3600 // 1 hour

    testDriver.addBrowser(connectionInfo, desired)
  }
}
