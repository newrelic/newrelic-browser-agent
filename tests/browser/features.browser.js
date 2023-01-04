/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('../../tools/jil/browser-test')
const {setup} = require('./utils/setup')
const {activateFeatures} = require('@newrelic/browser-agent-core/src/common/util/feature-flags')

const {baseEE, agentIdentifier} = setup();

test('activate features ', function (t) {
  var featFooCallbacks = 0
  var featBarCallbacks = 0
  baseEE.on('feat-foo', function () { featFooCallbacks += 1 })
  baseEE.on('feat-bar', function () { featBarCallbacks += 1 })

  t.plan(2)
  activateFeatures(null, agentIdentifier) // should trigger nothing
  activateFeatures({foo: 0, bar: 1}, agentIdentifier) // should only trigger feat-bar
  activateFeatures({foo: 0, bar: 1}, agentIdentifier) // should not trigger another feat-bar

  t.equal(featFooCallbacks, 0, 'foo should never be activated')
  t.equal(featBarCallbacks, 1, 'bar should only be activated once')
})

