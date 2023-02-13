/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let withTls = testDriver.Matcher.withFeature('tls')

let config = {
  applicationTime: 382,
  queueTime: 837,
  account: 'test_account',
  user: 'test_user',
  product: 'test_product',
  ttGuid: '21EC2020-3AEA-1069-A2DD-08002B30309D',
  applicationID: 'test_app_id',
  extra: 'test_extra',
  atts: 'test_atts',
  userAttributes: 'test_userAttributes'
}

testDriver.test('rum data', withTls, function (t, browser, router) {
  t.plan(13)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', { config }))

  Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    t.equal(+query.ap, 382, 'Application time')
    t.equal(+query.qt, 837, 'Queue time')
    t.ok(+query.fe >= +query.dc, 'Front end time')
    t.equal(query.ac, 'test_account', 'Account name')
    t.equal(query.us, 'test_user', 'User name')
    t.equal(query.pr, 'test_product', 'Product name')
    t.equal(query.tt, '21EC2020-3AEA-1069-A2DD-08002B30309D', 'TT GUID')
    t.equal(query.a, 'test_app_id', 'APP ID')
    t.equal(query.xx, 'test_extra', 'extra params')
    t.equal(query.ua, 'test_userAttributes', 'userAttributes params')
    t.equal(query.at, 'test_atts', 'atts params')
    t.equal(query.ja, '{"foo":"bar"}', 'custom javascript attributes params')

    if (browser.match('firefox@<=10')) {
      t.skip('old version of firefox dont report Dom content loaded correctly')
    } else {
      t.ok(+query.dc > 0, 'DOM content loaded time of ' + query.dc + ' is > 0')
    }

    t.end()
  })
    .catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})

testDriver.test('rum data with multiple app IDs', withTls, function (t, browser, router) {
  let config = {
    applicationID: '1234,5678'
  }

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', { config }))

  Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    t.equal(query.a, '1234,5678', 'APP ID')
    t.end()
  })
    .catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})

testDriver.test('rum data using loader_config data', withTls, function (t, browser, router) {
  t.plan(13)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', { config, injectUpdatedLoaderConfig: true }))

  Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    t.equal(+query.ap, 382, 'Application time')
    t.equal(+query.qt, 837, 'Queue time')
    t.ok(+query.fe >= +query.dc, 'Front end time')
    t.equal(query.ac, 'test_account', 'Account name')
    t.equal(query.us, 'test_user', 'User name')
    t.equal(query.pr, 'test_product', 'Product name')
    t.equal(query.tt, '21EC2020-3AEA-1069-A2DD-08002B30309D', 'TT GUID')
    t.equal(query.a, 'test_app_id', 'APP ID')
    t.equal(query.xx, 'test_extra', 'extra params')
    t.equal(query.ua, 'test_userAttributes', 'userAttributes params')
    t.equal(query.at, 'test_atts', 'atts params')
    t.equal(query.ja, '{"foo":"bar"}', 'custom javascript attributes params')

    if (browser.match('firefox@<=10')) {
      t.skip('old version of firefox dont report Dom content loaded correctly')
    } else {
      t.ok(+query.dc > 0, 'DOM content loaded time of ' + query.dc + ' is > 0')
    }

    t.end()
  })
    .catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})

testDriver.test('rum data with multiple app IDs using loader_config data', withTls, function (t, browser, router) {
  let config = {
    applicationID: '1234,5678'
  }

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', { config, injectUpdatedLoaderConfig: true }))

  Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    t.equal(query.a, '1234,5678', 'APP ID')
    t.end()
  })
    .catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})
