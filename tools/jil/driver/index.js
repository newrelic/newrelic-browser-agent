/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const wd = require('wd')
const asserters = require('wd').asserters
const ParallelDriver = require('./ParallelDriver')

wd.addAsyncMethod('initNewSession', function (browserSpec, testDriver, cb) {
  this.browserSpec = browserSpec
  this._testDriver = testDriver
  cb()
})

wd.addAsyncMethod('newSession', function (cb) {
  this.quit((err) => {
    if (err) return cb(err)
    return this.init(this.browserSpec.desired, cb)
      .get(this._testDriver.router.assetURL('/'))
  })
})

wd.addAsyncMethod('safeGet', function (url, cb) {
  this.get(url, (err) => {
    if (err) return cb(err)
    let condition = `window.location.toString().split("#")[0] === '${url}'`
    this.waitFor(asserters.jsCondition(condition, true), this._testDriver.timeout, cb)
  })
})

wd.addAsyncMethod('waitForFeature', function (feat, cb) {
  this.waitFor(
    asserters.jsCondition('window.NREUM && window.NREUM.setToken && window.NREUM.setToken.active.err'),
    this._testDriver.timeout,
    cb
  )
})

module.exports = ParallelDriver
