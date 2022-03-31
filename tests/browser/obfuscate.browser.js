/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var test = require('../../tools/jil/browser-test.js')
var obfuscate = require('../../agent/obfuscate')

test('Obfuscation module tests', function (t) {
  // happy path
  // sad path
  t.test('recognizes valid rules', function (t) {
    NREUM.init = {
      obfuscateUrls: [
        {
          regex: /[i]/g,
          replacement: 'j'
        },
        {
          regex: 'i',
          replacement: 'j'
        }
      ]
    }

    var rules = obfuscate.getRules()

    t.ok(obfuscate.validateRules(rules), 'rules valid')
    t.end()
  })
})
