import { faker } from '@faker-js/faker'
import * as configModule from '../../src/common/config/config'
import * as urlProtocolModule from '../../src/common/url/protocol'
import * as consolModule from '../../src/common/util/console'
import * as obfuscateModule from '../../src/common/util/obfuscate'

jest.mock('../../src/common/config/config')
jest.mock('../../src/common/context/shared-context')
jest.mock('../../src/common/url/protocol')
jest.mock('../../src/common/util/console')

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

describe('Obfuscator', () => {
  test('shouldObfuscate returns true when there are rules', () => {
    jest.spyOn(configModule, 'getConfigurationValue').mockReturnValue(rules)

    const obfuscator = new obfuscateModule.Obfuscator()
    obfuscator.sharedContext = { agentIdentifier }

    expect(obfuscator.shouldObfuscate()).toEqual(true)
  })

  test('shouldObfuscate returns false when there are no rules', () => {
    jest.spyOn(configModule, 'getConfigurationValue').mockReturnValue([])

    const obfuscator = new obfuscateModule.Obfuscator()
    obfuscator.sharedContext = { agentIdentifier }

    expect(obfuscator.shouldObfuscate()).toEqual(false)
  })

  test('obfuscateString returns the input when there are no rules', () => {
    jest.spyOn(configModule, 'getConfigurationValue').mockReturnValue([])

    const input = faker.lorem.sentence()
    const obfuscator = new obfuscateModule.Obfuscator()
    obfuscator.sharedContext = { agentIdentifier }

    expect(obfuscator.obfuscateString(input)).toEqual(input)
  })

  test('obfuscateString applies obfuscation rules to input', () => {
    jest.spyOn(configModule, 'getConfigurationValue').mockReturnValue(rules)

    const input = 'pii'
    const obfuscator = new obfuscateModule.Obfuscator()
    obfuscator.sharedContext = { agentIdentifier }

    expect(obfuscator.obfuscateString(input)).toEqual(rules[0].replacement)
  })

  test('obfuscateString replaces input with * when replacement is not set', () => {
    const newRules = [{
      regex: rules[0].regex
    }]

    jest.spyOn(configModule, 'getConfigurationValue').mockReturnValue(newRules)

    const input = 'pii'
    const obfuscator = new obfuscateModule.Obfuscator()
    obfuscator.sharedContext = { agentIdentifier }

    expect(obfuscator.obfuscateString(input)).toEqual('*')
  })

  test.each([
    null,
    undefined,
    '',
    123
  ])('obfuscateString returns the input it is %s', (input) => {
    jest.spyOn(configModule, 'getConfigurationValue').mockReturnValue(rules)

    const obfuscator = new obfuscateModule.Obfuscator()
    obfuscator.sharedContext = { agentIdentifier }

    expect(obfuscator.obfuscateString(input)).toEqual(input)
  })
})

describe('getRules', () => {
  test('should return configured rules', () => {
    jest.spyOn(configModule, 'getConfigurationValue').mockReturnValue(rules)

    expect(obfuscateModule.getRules()).toEqual(rules)
  })

  test('should include the file protocol obfuscation', () => {
    jest.spyOn(configModule, 'getConfigurationValue').mockReturnValue(rules)
    jest.spyOn(urlProtocolModule, 'isFileProtocol').mockReturnValue(rules)

    expect(obfuscateModule.getRules()).toEqual(expect.arrayContaining([{
      regex: /^file:\/\/(.*)/,
      replacement: 'file://OBFUSCATED'
    }]))
  })

  test.each([
    null,
    undefined
  ])('should return an empty array when obfuscation rules are %s', (input) => {
    jest.spyOn(configModule, 'getConfigurationValue').mockReturnValue(input)

    expect(obfuscateModule.getRules()).toEqual([])
  })
})

describe('validateRules', () => {
  test('should return true for empty array', () => {
    expect(obfuscateModule.validateRules([])).toEqual(true)
  })

  test('should return true for valid rules', () => {
    expect(obfuscateModule.validateRules(rules)).toEqual(true)
  })

  test.each([
    null,
    123,
    {},
    []
  ])('should warn about an invalid regex type %s', (input) => {
    const newRules = [{
      regex: input,
      replacement: rules[0].replacement
    }]

    expect(obfuscateModule.validateRules(newRules)).toEqual(false)
    expect(consolModule.warn).toHaveBeenCalledWith(13)
  })

  test('should warn about a missing regex with value', () => {
    const newRules = [{
      replacement: rules[0].replacement
    }]

    expect(obfuscateModule.validateRules(newRules)).toEqual(false)
    expect(consolModule.warn).toHaveBeenCalledWith(12)
  })

  test.each([
    123,
    {},
    []
  ])('should warn about an invalid replacement type %s', (input) => {
    const newRules = [{
      regex: rules[0].regex,
      replacement: input
    }]

    expect(obfuscateModule.validateRules(newRules)).toEqual(false)
    expect(consolModule.warn).toHaveBeenCalledWith(14)
  })
})
