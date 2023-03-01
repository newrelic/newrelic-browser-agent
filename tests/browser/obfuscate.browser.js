/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
import { setup } from './utils/setup'
import { setConfiguration } from '../../src/common/config/config'
import * as obfuscate from '../../src/common/util/obfuscate'
import { setScope, resetScope } from '../../src/common/util/global-scope'

const { aggregator, agentIdentifier } = setup()
const obfuscatorInst = new obfuscate.Obfuscator({ agentIdentifier })

console.log('obfuscate...')

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

jil.browserTest('Obfuscation validateRules input', function (t) {
  validationCases.forEach(function (testCase) {
    console.log('run test for ', testCase.name)
    t.test(testCase.name, function (t) {
      var result = obfuscate.validateRules([testCase.rule])
      t.equal(testCase.expected, result, 'expecting ' + testCase.expected)
      t.end()
    })
  })
})

jil.browserTest('Should Obfuscate', function (t) {
  setConfiguration(agentIdentifier, {
    obfuscate: validationCases.filter(x => x.expected).map(x => x.rule)
  })

  t.ok(obfuscatorInst.shouldObfuscate(), 'When init.obfuscate is defined, shouldObfuscate is true')

  //delete win.getWindowOrWorkerGlobScope().NREUM.init.obfuscate
  setConfiguration(agentIdentifier, {}) // note this'll reset the *whole* config to the default values
  t.ok(!obfuscatorInst.shouldObfuscate(), 'When init.obfuscate is NOT defined, shouldObfuscate is false')
  t.end()
})

jil.browserTest('Get Rules', function (t) {
  setConfiguration(agentIdentifier, {
    obfuscate: validationCases.filter(x => x.expected).map(x => x.rule)
  })

  t.ok(!!obfuscate.getRules(agentIdentifier).length, 'getRules should generate a list of rules from init.obfuscate')

  //delete win.getWindowOrWorkerGlobScope().NREUM.init.obfuscate
  setConfiguration(agentIdentifier, {}) // note this'll reset the *whole* config to the default values
  t.ok(!obfuscate.getRules(agentIdentifier).length, 'getRules should generate an empty list if init.obfuscate is undefined')

  setScope({ location: fileLocation })
  t.ok(!!obfuscate.getRules(agentIdentifier).filter(x => x.regex.source.includes('file')).length, 'getRules should generate a rule for file obfuscation if file protocol is detected')

  resetScope()
  t.end()
})

jil.browserTest('Obfuscate String Method', function (t) {
  setConfiguration(agentIdentifier, {
    obfuscate: validationCases.filter(x => x.expected).map(x => x.rule)
  })

  t.ok(!obfuscatorInst.obfuscateString('http://example.com/missing-replacement-field/123').includes('missing-replacement-field'), 'Successfully obfuscates missing replacement field')
  t.ok(!obfuscatorInst.obfuscateString('http://example.com/pii/123').includes('pii'), 'Successfully obfuscates string')
  t.ok(!obfuscatorInst.obfuscateString('http://example.com/abcdefghijklmnopqrstuvwxyz/123').includes('i'), 'Successfully obfuscates regex')

  setScope({ location: fileLocation })
  //delete win.getWindowOrWorkerGlobScope().NREUM.init.obfuscate
  setConfiguration(agentIdentifier, {}) // note this'll reset the *whole* config to the default values
  t.ok(obfuscatorInst.obfuscateString('file:///Users/jporter/Documents/Code/scratch/noticeErrorTest.html') === 'file://OBFUSCATED', 'Successfully obfuscates file protocol')

  resetScope()
  t.end()
})
