/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = new testDriver.Matcher()
  .exclude('ie@<8') // IE 6 & 7 sometimes fail this test, and we don't know why.

testDriver.test('inline hit api', supported, function (t, browser, router) {
  t.plan(17)

  let loadPromise = browser.get(router.assetURL('inline-hit.html'))
  let rumData = {}

  Promise.all([
    loadPromise,
    router.expectRum().then(({ request: data }) => { rumData[data.query.t] = data }),
    router.expectRum().then(({ request: data }) => { rumData[data.query.t] = data }),
    router.expectRum().then(({ request: data }) => { rumData[data.query.t] = data }),
    router.expectRum().then(({ request: data }) => { rumData[data.query.t] = data })
  ])
    .then(checkResults)
    .catch(fail)

  function checkResults () {
    inlineHit1(rumData['/inline-hit-1'])
    inlineHit2(rumData['/inline-hit-2'])
    inlineHit3(rumData[encodeURIComponent('maliciouse&foo')])
  }

  function inlineHit1 ({ query }) {
    t.equal(query.a, '42', 'inlineHit app id')
    t.equal(query.t, '/inline-hit-1', 'inlineHit request name')
    t.equal(+query.qt, 378, 'inlineHit queue time')
    t.equal(+query.ap, 198, 'inlineHit app time')
    t.equal(+query.be, 829, 'inlineHit backend time')
    t.equal(+query.dc, 290, 'inlineHit DOM time')
    t.equal(+query.fe, 401, 'inlineHit frontend time')
    t.equal(+query.c, 1, 'inlineHit cycle 1')
  }

  function inlineHit2 ({ query }) {
    t.equal(+query.c, 2, 'inlineHit cycle 2')
  }

  function inlineHit3 ({ query }) {
    t.equal(query.a, '42', 'inlineHit app id')
    t.equal(query.t, encodeURIComponent('maliciouse&foo'), 'inlineHit request name')
    t.equal(+query.qt, 0, 'inlineHit queue time')
    t.equal(+query.ap, 0, 'inlineHit app time')
    t.equal(+query.be, 0, 'inlineHit backend time')
    t.equal(+query.dc, 0, 'inlineHit DOM time')
    t.equal(+query.fe, 0, 'inlineHit frontend time')
    t.equal(+query.c, 3, 'inlineHit cycle 1')
    t.end()
  }

  function fail (err) {
    t.error(err)
    t.end()
  }
})
