import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { bufferLog, isValidLogLevel } from '../../../src/features/logging/shared/utils'
import * as handleModule from '../../../src/common/event-emitter/handle'

const agentIdentifier = 'abcd'
describe('logging utils component tests', () => {
  beforeEach(() => {
    jest.spyOn(handleModule, 'handle')
  })
  afterEach(() => {
    jest.clearAllMocks()
  })
  describe('bufferLog', () => {
    it('should buffer logs with non-string message', () => {
      ;[true, { test: 1 }, ['1'], 1].forEach((message, idx) => {
        const currIdx = idx * 2
        bufferLog(ee.get(agentIdentifier), message)
        expect(handleModule.handle.mock.calls[currIdx][0]).toEqual('storeSupportabilityMetrics')
        expect(handleModule.handle.mock.calls[currIdx][1]).toEqual(['API/logging/info/called'])
        expect(handleModule.handle.mock.calls[currIdx + 1][0]).toEqual('log')
        expect(handleModule.handle.mock.calls[currIdx + 1][1]).toEqual([expect.any(Number), JSON.stringify(message), {}, 'info'])
      })
    })
    it('should buffer logs with message only', () => {
      bufferLog(ee.get(agentIdentifier), 'testMessage')
      expect(handleModule.handle.mock.calls[0][0]).toEqual('storeSupportabilityMetrics')
      expect(handleModule.handle.mock.calls[0][1]).toEqual(['API/logging/info/called'])
      expect(handleModule.handle.mock.calls[1][0]).toEqual('log')
      expect(handleModule.handle.mock.calls[1][1]).toEqual([expect.any(Number), 'testMessage', {}, 'info'])
    })
    it('should buffer logs with message and custom attributes', () => {
      bufferLog(ee.get(agentIdentifier), 'testMessage', { test1: 1, test2: true, test3: { nested: true } })
      expect(handleModule.handle.mock.calls[0][0]).toEqual('storeSupportabilityMetrics')
      expect(handleModule.handle.mock.calls[0][1]).toEqual(['API/logging/info/called'])
      expect(handleModule.handle.mock.calls[1][0]).toEqual('log')
      expect(handleModule.handle.mock.calls[1][1]).toEqual([expect.any(Number), 'testMessage', { test1: 1, test2: true, test3: { nested: true } }, 'info'])
    })
    it('should buffer logs with message, custom attributes, and custom level', () => {
      bufferLog(ee.get(agentIdentifier), 'testMessage', { test1: 1, test2: true, test3: { nested: true } }, 'error')
      expect(handleModule.handle.mock.calls[0][0]).toEqual('storeSupportabilityMetrics')
      expect(handleModule.handle.mock.calls[0][1]).toEqual(['API/logging/error/called'])
      expect(handleModule.handle.mock.calls[1][0]).toEqual('log')
      expect(handleModule.handle.mock.calls[1][1]).toEqual([expect.any(Number), 'testMessage', { test1: 1, test2: true, test3: { nested: true } }, 'error'])
    })
  })

  describe('isValidLogLevel', () => {
    test('should detect valid and invalid log levels', () => {
      const validLogLevels = ['info', 'trace', 'debug', 'warn', 'error']
      const validLogLevelsCasing = ['INFO', 'tRaCe']
      const invalidLogLevels = ['', 'bad', true, false, {}, []]

      expect(validLogLevels.every(level => isValidLogLevel(level))).toEqual(true)
      expect(validLogLevelsCasing.every(level => isValidLogLevel(level))).toEqual(true)
      expect(invalidLogLevels.every(level => !isValidLogLevel(level))).toEqual(true)
    })
  })
})