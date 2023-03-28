/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

const matcher = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')

const testBuilds = [
  'browser-agent',
  'custom-agent-lite',
  'custom-agent-pro',
  'custom-agent-spa'
]

testBuilds.forEach(build => {
  testDriver.test(`NPM agent -- ${build} -- sends RUM call`, matcher, function (t, browser, router) {
    let url = router.assetURL(`test-builds/browser-agent-wrapper/${build}.html`)

    let rumPromise = router.expectRum()
    let loadPromise = browser.get(url)

    Promise.all([rumPromise, loadPromise]).then(() => {
      t.pass('RUM call was sent')
      t.end()
    }).catch(err => {
      t.error(err)
      t.end()
    })
  })
})
