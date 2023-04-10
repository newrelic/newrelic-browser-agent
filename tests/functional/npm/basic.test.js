/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

const testBuilds = [
  'browser-agent',
  'custom-agent-lite',
  'custom-agent-pro',
  'custom-agent-spa',
  'worker-agent'
]

testBuilds.forEach(build => {
  testDriver.test(`NPM agent dist -- ${build} -- sends RUM call`, testDriver.Matcher.withFeature('npmDist'), function (t, browser, router) {
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

// Commented out for now until we resolve the issue with process.env.* being in the source code
testBuilds.forEach(build => {
  testDriver.test(`NPM agent src -- ${build} -- sends RUM call`, testDriver.Matcher.withFeature('npmSrc'), function (t, browser, router) {
    let url = router.assetURL(`test-builds/raw-src-wrapper/${build}.html`)

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

testDriver.test('NPM agent -- vite-react-wrapper -- sends RUM call', testDriver.Matcher.withFeature('npmDist'), function (t, browser, router) {
  let url = router.assetURL('test-builds/vite-react-wrapper/index.html')

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
