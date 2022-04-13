/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var jil = require('jil')

const matcher = require('jil/util/browser-matcher')
let supported = matcher.withFeature('obfuscate')

var fileLocation = {
  hash: '',
  host: '',
  hostname: '',
  href: 'file:///Users/jporter/Documents/Code/test.html',
  origin: 'file://',
  pathname: '/Users/jporter/Documents/Code/test.html',
  port: '',
  protocol: 'file:'
}

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

jil.browserTest('Obfuscation validateRules input', supported, function (t) {
  const obfuscate = require('../../agent/obfuscate')

  validationCases.forEach(function (testCase) {
    t.test(testCase.name, function (t) {
      var result = obfuscate.validateRules([testCase.rule])
      t.equal(testCase.expected, result, 'expecting ' + testCase.expected)
      t.end()
    })
  })
})

jil.browserTest('Should Obfuscate', supported, function (t) {
  const win = require('../../agent/win')
  win.getWindow().NREUM = {
    init: {
      obfuscate: validationCases.filter(x => x.expected).map(x => x.rule)
    }
  }

  const obfuscate = require('../../agent/obfuscate')
  t.ok(obfuscate.shouldObfuscate(), 'When init.obfuscate is defined, shouldObfuscate is true')

  delete win.getWindow().NREUM.init.obfuscate
  t.ok(!obfuscate.shouldObfuscate(), 'When init.obfuscate is NOT defined, shouldObfuscate is false')
  t.end()
})

jil.browserTest('Get Rules', supported, function (t) {
  const win = require('../../agent/win')
  win.getWindow().NREUM = {
    init: {
      obfuscate: validationCases.filter(x => x.expected).map(x => x.rule)
    }
  }

  const obfuscate = require('../../agent/obfuscate')
  t.ok(!!obfuscate.getRules().length, 'getRules should generate a list of rules from init.obfuscate')

  delete win.getWindow().NREUM.init.obfuscate
  t.ok(!obfuscate.getRules().length, 'getRules should generate an empty list if init.obfuscate is undefined')

  win.setWindow({ ...win.getWindow(), location: { ...fileLocation } })
  t.ok(!!obfuscate.getRules().filter(x => x.regex.source.includes('file')).length, 'getRules should generate a rule for file obfuscation if file protocol is detected')

  win.resetWindow()
  t.end()
})

jil.browserTest('Obfuscate String Method', supported, function (t) {
  const win = require('../../agent/win')
  win.getWindow().NREUM = {
    init: {
      obfuscate: validationCases.filter(x => x.expected).map(x => x.rule)
    }
  }

  const obfuscate = require('../../agent/obfuscate')

  t.ok(!obfuscate.obfuscateString('http://example.com/missing-replacement-field/123').includes('missing-replacement-field'), 'Successfully obfuscates missing replacement field')
  t.ok(!obfuscate.obfuscateString('http://example.com/pii/123').includes('pii'), 'Successfully obfuscates string')
  t.ok(!obfuscate.obfuscateString('http://example.com/abcdefghijklmnopqrstuvwxyz/123').includes('i'), 'Successfully obfuscates regex')

  win.setWindow({ ...win.getWindow(), location: { ...fileLocation } })
  delete window.NREUM.init.obfuscate
  t.ok(obfuscate.obfuscateString('file:///Users/jporter/Documents/Code/scratch/noticeErrorTest.html') === 'file://OBFUSCATED', 'Successfully obfuscates file protocol')

  win.resetWindow()
  t.end()
})
