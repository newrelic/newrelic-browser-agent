/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../tools/jil/browser-test'
import { setup } from './utils/setup'
import { setConfiguration, getConfigurationValue } from '../../src/common/config/config'

const { agentIdentifier } = setup()

test('getConfiguration', function (t) {
  t.test('does not set value for property not in model', function (t) {
    setConfiguration(agentIdentifier, { a: 123 })
    t.equal(getConfigurationValue(agentIdentifier, 'a'), undefined)

    setConfiguration(agentIdentifier, { a: { b: 123 } })
    t.equal(getConfigurationValue(agentIdentifier, 'a.b'), undefined)

    setConfiguration(agentIdentifier, { a: { b: { c: 123 } } })
    t.equal(getConfigurationValue(agentIdentifier, 'a.b.c'), undefined)

    t.end()
  })

  t.test('returns value from NREUM.init using provided path', function (t) {
    setConfiguration(agentIdentifier, { ajax: 123 })
    t.equal(getConfigurationValue(agentIdentifier, 'ajax'), 123)

    setConfiguration(agentIdentifier, { ajax: { a: true } })
    t.equal(getConfigurationValue(agentIdentifier, 'ajax.a'), true)

    setConfiguration(agentIdentifier, { ajax: { a: { b: 123 } } })
    t.equal(getConfigurationValue(agentIdentifier, 'ajax.a.b'), 123)

    t.end()
  })

  t.test('returns undefined when path does not match', function (t) {
    setConfiguration(agentIdentifier, { ajax: 123 })
    t.equal(getConfigurationValue(agentIdentifier, 'b', 456), undefined)

    setConfiguration(agentIdentifier, { ajax: { b: 123 } })
    t.equal(getConfigurationValue(agentIdentifier, 'ajax.c', 456), undefined)

    t.end()
  })

  t.test('returns undefined when configuration is missing', function (t) {
    //delete NREUM.init
    // DEPRECATED case: the underlying config storage is not exposed and it has no deletion method (yet).
    //  Any alternative would be equivalent to the test immediately below.
    //t.equal(getConfigurationValue(agentIdentifier, 'a', 456), undefined)

    setConfiguration(agentIdentifier, {})
    t.equal(getConfigurationValue(agentIdentifier, 'a', 456), undefined)

    t.end()
  })
})
