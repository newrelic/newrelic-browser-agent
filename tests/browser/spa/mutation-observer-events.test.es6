/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('mutation')

jil.browserTest('fn-start events for MutationObserver callbacks should have args', supported, function (t) {
  t.plan(3)

  var ee = require('ee')
  require('loader')
  require('../../../feature/wrap-mutation')

  var el = document.createElement('div')
  document.body.appendChild(el)

  var observer = new MutationObserver(function (mutationRecords, o) {
    t.equal(mutationRecords.length, 1, 'callback gets one mutation record')
    t.equal(o, observer, 'observer received in callback matches original observer')
  })

  ee.on('fn-start', function (args) {
    t.equal(args.length, 2, 'fn-start event gets MutationObserver callback args')
  })

  observer.observe(el, { attributes: true })

  el.setAttribute('foo', 'bar')
})
