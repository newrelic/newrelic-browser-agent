/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import sauceConnectLauncher from 'sauce-connect-launcher'
import os from 'os'
import childProcess from 'child_process'
import phantomjs from 'phantomjs-prebuilt'

let externalServices = new Set()

export function getSauceLabsCreds () {
  let sauceLabsUsername = process.env.JIL_SAUCE_LABS_USERNAME
  let sauceLabsAccessKey = process.env.JIL_SAUCE_LABS_ACCESS_KEY

  if (!sauceLabsUsername || !sauceLabsAccessKey) {
    throw new Error('Did not find Sauce Labs credentials in JIL_SAUCE_LABS_USERNAME and JIL_SAUCE_LABS_ACCESS_KEY environment variables. Please set them.')
  }

  return {
    username: sauceLabsUsername,
    accessKey: sauceLabsAccessKey
  }
}

export function startExternalServices (browsers, config, cb) {
  let needPhantom = Array.from(browsers).filter((b) => b.isPhantom()).length
  let needSauce = !!config.sauce

  if (!needPhantom && !needSauce) return cb()

  let remaining = [needPhantom, needSauce].filter(Boolean).length

  if (needPhantom) startPhantom(checkDone)
  if (needSauce) startSauce(config, checkDone)

  function checkDone () {
    if (--remaining) return
    cb()
  }
}

export function stopExternalServices () {
  for (let service of externalServices) {
    service.kill()
  }
}

function startPhantom (cb) {
  let args = ['--webdriver=4444', '--ignore-ssl-errors=true']
  let child = childProcess.execFile(phantomjs.path, args)

  let timeout = setTimeout(() => {
    child.kill()
    cb(new Error('phantom did not start correctly'))
  }, 3000)

  child.stdout.on('data', (data) => {
    if (data.indexOf('running on port') !== -1) {
      clearTimeout(timeout)
      child.stdout.removeAllListeners()
      cb()
      cb = function noop () {}
    }
  })

  child.stderr.pipe(process.stderr)
  process.on('exit', () => child.kill())

  externalServices.add(child)
  child.on('exit', () => externalServices.delete(child))

  return child
}

export function startSauce (config, cb) {
  var tunnelIdentifier = process.env.USER + '@' + os.hostname()
  var sauceCreds = getSauceLabsCreds()

  var opts = {
    username: sauceCreds.username,
    accessKey: sauceCreds.accessKey,
    tunnelIdentifier: tunnelIdentifier,
    noSslBumpDomains: 'all'
  }

  if (config.verbose) {
    opts.verbose = true
    opts.verboseDebugging = true
    console.log('starting sauce-connect with tunnel ID = ' + tunnelIdentifier)
  }

  sauceConnectLauncher(opts, function (err, sauceConnect) {
    if (err) {
      return cb(new Error('Failed to start sauce-connect: ' + err.message))
    }

    externalServices.add(sauceConnect)
    sauceConnect.on('exit', () => externalServices.delete(sauceConnect))

    cb()
  })
}

export function isSauceConnected() {
  for (let item of externalServices.values()) {
    if (item.spawnfile.indexOf('sauce-connect-launcher') > -1) {
      return true
    }
  }
  return false
}

