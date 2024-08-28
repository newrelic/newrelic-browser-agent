import { faker } from '@faker-js/faker'
import { Obfuscator } from '../../../../src/common/util/obfuscate'
import * as initModule from '../../../../src/common/config/init'
import * as urlProtocolModule from '../../../../src/common/url/protocol'
import * as consoleModule from '../../../../src/common/util/console'

jest.mock('../../../../src/common/config/init')
jest.mock('../../../../src/common/context/shared-context')
jest.mock('../../../../src/common/url/protocol')
jest.mock('../../../../src/common/util/console')

let agentIdentifier
const rules = [{
  regex: /pii/g,
  replacement: 'OBFUSCATED'
}]

beforeEach(() => {
  agentIdentifier = faker.string.uuid()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('obfuscateString', () => {
  test('obfuscateString returns the input when there are no rules', () => {
    jest.spyOn(initModule, 'getConfigurationValue').mockReturnValue([])

    const input = faker.lorem.sentence()
    const obfuscator = new Obfuscator()
    obfuscator.sharedContext = { agentIdentifier }

    expect(obfuscator.obfuscateString(input)).toEqual(input)
  })

  test('obfuscateString applies obfuscation rules to input', () => {
    jest.spyOn(initModule, 'getConfigurationValue').mockReturnValue(rules)

    const input = 'pii'
    const obfuscator = new Obfuscator()
    obfuscator.sharedContext = { agentIdentifier }

    expect(obfuscator.obfuscateString(input)).toEqual(rules[0].replacement)
  })

  test('obfuscateString replaces input with * when replacement is not set', () => {
    const newRules = [{
      regex: rules[0].regex
    }]

    jest.spyOn(initModule, 'getConfigurationValue').mockReturnValue(newRules)

    const input = 'pii'
    const obfuscator = new Obfuscator()
    obfuscator.sharedContext = { agentIdentifier }

    expect(obfuscator.obfuscateString(input)).toEqual('*')
  })

  test.each([
    null,
    undefined,
    '',
    123
  ])('obfuscateString returns the input it is %s', (input) => {
    jest.spyOn(initModule, 'getConfigurationValue').mockReturnValue(rules)

    const obfuscator = new Obfuscator()
    obfuscator.sharedContext = { agentIdentifier }

    expect(obfuscator.obfuscateString(input)).toEqual(input)
  })
})

describe('getRuleValidationCache', () => {
  test('should return configured rules with validation information', () => {
    jest.spyOn(initModule, 'getConfigurationValue').mockReturnValue(rules)

    expect(Obfuscator.getRuleValidationCache(agentIdentifier)).toEqual([
      {
        rule: rules[0],
        isValid: true,
        errors: {
          regexMissingDetected: false,
          invalidRegexDetected: false,
          invalidReplacementDetected: false
        }
      }
    ])
  })

  test('should include the file protocol obfuscation', () => {
    jest.spyOn(initModule, 'getConfigurationValue').mockReturnValue(rules)
    jest.spyOn(urlProtocolModule, 'isFileProtocol').mockReturnValue(rules)

    expect(Obfuscator.getRuleValidationCache(agentIdentifier)).toEqual(expect.arrayContaining([{
      rule: {
        regex: /^file:\/\/(.*)/,
        replacement: 'file://OBFUSCATED'
      },
      isValid: true,
      errors: {
        regexMissingDetected: false,
        invalidRegexDetected: false,
        invalidReplacementDetected: false
      }
    }]))
  })

  test.each([
    null,
    undefined
  ])('should return an empty array when obfuscation rules are %s', (input) => {
    jest.spyOn(initModule, 'getConfigurationValue').mockReturnValue(input)

    expect(Obfuscator.getRuleValidationCache(agentIdentifier)).toEqual([])
  })
})

describe('validateObfuscationRule', () => {
  test('should return invalid for rule missing regex', () => {
    const rule = {
      replacement: faker.lorem.text()
    }

    expect(Obfuscator.validateObfuscationRule(rule)).toEqual({
      rule,
      isValid: false,
      errors: {
        regexMissingDetected: true,
        invalidRegexDetected: false,
        invalidReplacementDetected: false
      }
    })
  })

  test.each([
    null,
    123,
    {},
    []
  ])('should return invalid for rule containing regex type %s', (input) => {
    const rule = {
      regex: input,
      replacement: faker.lorem.text()
    }

    expect(Obfuscator.validateObfuscationRule(rule)).toEqual({
      rule,
      isValid: false,
      errors: {
        regexMissingDetected: false,
        invalidRegexDetected: true,
        invalidReplacementDetected: false
      }
    })
  })

  test.each([
    123,
    {},
    []
  ])('should return invalid for rule containing replacement type %s', (input) => {
    const rule = {
      regex: rules[0].regex,
      replacement: input
    }

    expect(Obfuscator.validateObfuscationRule(rule)).toEqual({
      rule,
      isValid: false,
      errors: {
        regexMissingDetected: false,
        invalidRegexDetected: false,
        invalidReplacementDetected: true
      }
    })
  })

  test('should return valid for a valid rule', () => {
    const rule = rules[0]

    expect(Obfuscator.validateObfuscationRule(rule)).toEqual({
      rule,
      isValid: true,
      errors: {
        regexMissingDetected: false,
        invalidRegexDetected: false,
        invalidReplacementDetected: false
      }
    })
  })
})

describe('logObfuscationRuleErrors', () => {
  test('should warn for rule missing regex', () => {
    const rule = {
      replacement: faker.lorem.text()
    }
    Obfuscator.logObfuscationRuleErrors([Obfuscator.validateObfuscationRule(rule)])

    expect(consoleModule.warn).toHaveBeenCalledWith(12, rule)
  })

  test.each([
    null,
    123,
    {},
    []
  ])('should warn for rule containing regex type %s', (input) => {
    const rule = {
      regex: input,
      replacement: faker.lorem.text()
    }
    Obfuscator.logObfuscationRuleErrors([Obfuscator.validateObfuscationRule(rule)])

    expect(consoleModule.warn).toHaveBeenCalledWith(13, rule)
  })

  test.each([
    123,
    {},
    []
  ])('should warn for rule containing replacement type %s', (input) => {
    const rule = {
      regex: rules[0].regex,
      replacement: input
    }
    Obfuscator.logObfuscationRuleErrors([Obfuscator.validateObfuscationRule(rule)])

    expect(consoleModule.warn).toHaveBeenCalledWith(14, rule)
  })

  test('should not warn for a valid rule', () => {
    const rule = rules[0]
    Obfuscator.logObfuscationRuleErrors([Obfuscator.validateObfuscationRule(rule)])

    expect(consoleModule.warn).not.toHaveBeenCalled()
  })
})
