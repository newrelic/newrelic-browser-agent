/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
const process = require('process')

let sauceConnectInstance

function getSauceLabsCreds () {
  let sauceLabsUsername = process.env.SAUCE_USERNAME
  let sauceLabsAccessKey = process.env.SAUCE_ACCESS_KEY

  if (!sauceLabsUsername || !sauceLabsAccessKey) {
    throw new Error('Did not find Sauce Labs credentials in SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables. Please set them.')
  }

  return {
    username: sauceLabsUsername,
    accessKey: sauceLabsAccessKey
  }
}

function startExternalServices (browsers, config, cb) {
  let needSauce = !!config.sauce

  if (!needSauce) return cb()

  import('../../saucelabs/utils.mjs')
    .then(({ startSauceConnect }) =>
      startSauceConnect(config)
    )
    .then((instance) => {
      sauceConnectInstance = instance
      cb()
    })
}

function stopExternalServices () {
  if (sauceConnectInstance) {
    sauceConnectInstance.close()
    sauceConnectInstance = null
  }
}

function isSauceConnected () {
  return !!sauceConnectInstance
}

module.exports = { getSauceLabsCreds, startExternalServices, stopExternalServices, isSauceConnected }
