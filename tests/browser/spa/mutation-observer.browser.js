/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

const { setup } = require('../utils/setup')

const setupData = setup()
const {agentIdentifier, nr} = setupData

jil.browserTest('MutationObserver instanceof check', function (t) {
  var origMutationObserver = MutationObserver
  const {Instrument} = require('@newrelic/browser-agent-core/src/features/spa/instrument/index.js')
  new Instrument(agentIdentifier)

  var observer = new MutationObserver(function () {})

  t.ok(observer instanceof MutationObserver, 'observer should be an instanceof MutationObserver')
  t.ok(observer instanceof origMutationObserver, 'observer should be an instanceof original MutationObserver')
  t.end()
})

jil.browserTest('MutationObserver double-instrumentation', function (t) {
  var OrigMutationObserver = MutationObserver
  const {Instrument} = require('@newrelic/browser-agent-core/src/features/spa/instrument/index.js')
  new Instrument(agentIdentifier)

  // This simulates what zone.js does when they wrap MutationObserver
  var WrappedObserver = function (cb) {
    return new OrigMutationObserver(cb)
  }
  window.MutationObserver = WrappedObserver

  var observer = new MutationObserver(function () {})

  t.ok(observer, 'successfully created new double-wrapped MutationObserver instance')
  t.end()
})

jil.browserTest('MutationObserver functionality check', function (t) {
  const {Instrument} = require('@newrelic/browser-agent-core/src/features/spa/instrument/index.js')
  new Instrument(agentIdentifier)
  let callbackInvocations = 0

  var observer = new MutationObserver(function () {
    callbackInvocations++
  })

  let el = document.createElement('div')
  document.body.appendChild(el)

  // Observing the same element twice should still result in the callback being
  // invoked only once.
  observer.observe(el, { attributes: true })
  observer.observe(el, { attributes: true })

  el.setAttribute('foo', 'bar')

  setTimeout(() => {
    t.equal(callbackInvocations, 1, 'expected callback to have been invoked exactly once')

    observer.disconnect()

    el.setAttribute('bar', 'baz')
    setTimeout(() => {
      t.equal(callbackInvocations, 1, 'expected callback to not be invoked after disconnect')
      t.end()
    })
  })
})
