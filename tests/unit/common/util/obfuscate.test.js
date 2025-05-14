import { faker } from '@faker-js/faker'
import { Obfuscator } from '../../../../src/common/util/obfuscate'

jest.mock('../../../../src/common/url/protocol')
jest.mock('../../../../src/common/util/console')

const rules = [{
  regex: /pii/g,
  replacement: 'OBFUSCATED'
}]

describe('obfuscateString', () => {
  test('obfuscateString returns the input when there are no rules', () => {
    const input = faker.lorem.sentence()
    const obfuscator = new Obfuscator({ init: { obfuscate: [] } })

    expect(obfuscator.obfuscateString(input)).toEqual(input)
  })

  test('obfuscateString applies obfuscation rules to input', () => {
    const input = 'pii'
    const obfuscator = new Obfuscator({ init: { obfuscate: rules } })

    expect(obfuscator.obfuscateString(input)).toEqual(rules[0].replacement)
  })

  test('obfuscateString replaces input with * when replacement is not set', () => {
    const newRules = [{
      regex: rules[0].regex
    }]

    const input = 'pii'
    const obfuscator = new Obfuscator({ init: { obfuscate: newRules } })

    expect(obfuscator.obfuscateString(input)).toEqual('*')
  })

  test.each([
    null,
    undefined,
    '',
    123
  ])('obfuscateString returns the input as-is if %s', (input) => {
    const obfuscator = new Obfuscator({ init: { obfuscate: rules } })

    expect(obfuscator.obfuscateString(input)).toEqual(input)
  })
})

describe('validateObfuscationRule', () => {
  test('should return invalid for rule missing regex', () => {
    const rule = {
      replacement: faker.lorem.text()
    }

    const obfuscator = new Obfuscator({ init: { obfuscate: [] } })
    expect(obfuscator.validateObfuscationRule(rule)).toEqual({
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

    const obfuscator = new Obfuscator({ init: { obfuscate: [] } })

    expect(obfuscator.validateObfuscationRule(rule)).toEqual({
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

    const obfuscator = new Obfuscator({ init: { obfuscate: [] } })
    expect(obfuscator.validateObfuscationRule(rule)).toEqual({
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

    const obfuscator = new Obfuscator({ init: { obfuscate: [] } })
    expect(obfuscator.validateObfuscationRule(rule)).toEqual({
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
