import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { bufferLog, isValidLogLevel } from '../../../src/features/logging/shared/utils'
import * as handleModule from '../../../src/common/event-emitter/handle'
import { faker } from '@faker-js/faker'

const agentIdentifier = faker.string.uuid()

beforeEach(() => {
  jest.spyOn(handleModule, 'handle')
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('bufferLog', () => {
  test.each([
    true, { test: 1 }, ['1'], 1
  ])('should buffer logs with non-string message %s', (message) => {
    bufferLog(ee.get(agentIdentifier), message)

    expect(handleModule.handle.mock.calls[0][0]).toEqual('storeSupportabilityMetrics')
    expect(handleModule.handle.mock.calls[0][1]).toEqual(['API/logging/info/called'])
    expect(handleModule.handle.mock.calls[1][0]).toEqual('log')
    expect(handleModule.handle.mock.calls[1][1]).toEqual([expect.any(Number), message, {}, 'INFO'])

    // method should not cast to '' or '{}'
    expect(handleModule.handle.mock.calls[1][1][1]).not.toEqual('')
    expect(handleModule.handle.mock.calls[1][1][1]).not.toEqual('{}')
    expect(handleModule.handle.mock.calls[1][1][1]).not.toEqual('[object Object]')
  })

  test('should buffer logs with message only', () => {
    const message = faker.string.uuid()
    bufferLog(ee.get(agentIdentifier), message)

    expect(handleModule.handle.mock.calls[0][0]).toEqual('storeSupportabilityMetrics')
    expect(handleModule.handle.mock.calls[0][1]).toEqual(['API/logging/info/called'])
    expect(handleModule.handle.mock.calls[1][0]).toEqual('log')
    expect(handleModule.handle.mock.calls[1][1]).toEqual([expect.any(Number), message, {}, 'INFO'])
  })

  test('should buffer logs with message and custom attributes', () => {
    const message = faker.string.uuid()
    const customAttributes = { test1: 1, test2: true, test3: { nested: true } }
    bufferLog(ee.get(agentIdentifier), message, customAttributes)

    expect(handleModule.handle.mock.calls[0][0]).toEqual('storeSupportabilityMetrics')
    expect(handleModule.handle.mock.calls[0][1]).toEqual(['API/logging/info/called'])
    expect(handleModule.handle.mock.calls[1][0]).toEqual('log')
    expect(handleModule.handle.mock.calls[1][1]).toEqual([expect.any(Number), message, customAttributes, 'INFO'])
  })

  test('should buffer logs with message, custom attributes, and custom level', () => {
    const message = faker.string.uuid()
    const customAttributes = { test1: 1, test2: true, test3: { nested: true } }
    bufferLog(ee.get(agentIdentifier), message, customAttributes, 'ERROR')

    expect(handleModule.handle.mock.calls[0][0]).toEqual('storeSupportabilityMetrics')
    expect(handleModule.handle.mock.calls[0][1]).toEqual(['API/logging/error/called'])
    expect(handleModule.handle.mock.calls[1][0]).toEqual('log')
    expect(handleModule.handle.mock.calls[1][1]).toEqual([expect.any(Number), message, customAttributes, 'ERROR'])
  })
})

describe('isValidLogLevel', () => {
  test.each([
    'info', 'trace', 'debug', 'warn', 'error',
    'INFO', 'TRACE', 'DEBUG', 'WARN', 'ERROR',
    'Info', 'Trace', 'Debug', 'Warn', 'Error',
    '  info  ', '  trace  ', '  debug  ', '  warn  ', '  error  '
  ])('should detect valid log levels: %s', (level) => {
    expect(isValidLogLevel(level)).toEqual(true)
  })

  test.each([
    // eslint-disable-next-line no-new-wrappers
    '', 'bad', true, false, {}, [], new String('info')
  ])('should detect invalid log levels: %s', (level) => {
    expect(isValidLogLevel(level)).toEqual(false)
  })
})
