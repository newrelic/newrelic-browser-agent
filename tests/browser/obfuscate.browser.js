/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var test = require('../../tools/jil/browser-test.js')

test('Obfuscation validateRules input', function (t) {
  var obfuscate = require('../../agent/obfuscate')
  var validationCases = [
    {
      name: 'Invalid: missing regex',
      expected: false,
      rule: {
        replacement: 'missing-regex-field'
      }
    },
    {
      // this case is okay because when replacement is null, replacement defaults to '*'
      name: 'Valid: missing replacement',
      expected: true,
      rule: {
        regex: 'missing-replacment-field'
      }
    },
    {
      name: 'Invalid regex type (must be string or RegExp)',
      expected: false,
      rule: {
        regex: {},
        replacement: 'invalid regex type'
      }
    },
    {
      name: 'Invalid replacement character (,)',
      expected: false,
      rule: {
        regex: 'invalid-replacement-character',
        replacement: ','
      }
    },
    {
      name: 'Invalid replacement character (;)',
      expected: false,
      rule: {
        regex: 'invalid-replacement-character',
        replacement: ';'
      }
    },
    {
      name: 'Invalid replacement character (\\)',
      expected: false,
      rule: {
        regex: 'invalid-replacement-character',
        replacement: '\\'
      }
    },
    {
      name: 'Invalid replacement type (must be string)',
      expected: false,
      rule: {
        regex: 'invalid-replacement-type',
        replacement: {}
      }
    },
    {
      name: 'Valid string regex',
      expected: true,
      rule: {
        regex: 'pii',
        replacement: 'obfuscated'
      }
    },
    {
      name: 'Valid RegExp regex',
      expected: true,
      rule: {
        regex: /[i]/g,
        replacement: 'obfuscated'
      }
    }
  ]

  validationCases.forEach(function (testCase) {
    t.test(testCase.name, function (t) {
      var result = obfuscate.validateRules([testCase.rule])
      t.equal(testCase.expected, result, 'expecting ' + testCase.expected)
      t.end()
    })
  })
})
