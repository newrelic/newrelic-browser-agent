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
        expect(handleModule.handle.mock.calls[currIdx + 1][1]).toEqual([expect.any(Number), message, {}, 'INFO'])
        // method should not cast to '' or '{}'
        expect(handleModule.handle.mock.calls[currIdx + 1][1][1]).not.toEqual('')
        expect(handleModule.handle.mock.calls[currIdx + 1][1][1]).not.toEqual('{}')
        expect(handleModule.handle.mock.calls[currIdx + 1][1][1]).not.toEqual('[object Object]')
      })
    })
    it('should buffer logs with message only', () => {
      bufferLog(ee.get(agentIdentifier), 'testMessage')
      expect(handleModule.handle.mock.calls[0][0]).toEqual('storeSupportabilityMetrics')
      expect(handleModule.handle.mock.calls[0][1]).toEqual(['API/logging/info/called'])
      expect(handleModule.handle.mock.calls[1][0]).toEqual('log')
      expect(handleModule.handle.mock.calls[1][1]).toEqual([expect.any(Number), 'testMessage', {}, 'INFO'])
    })
    it('should buffer logs with message and custom attributes', () => {
      bufferLog(ee.get(agentIdentifier), 'testMessage', { test1: 1, test2: true, test3: { nested: true } })
      expect(handleModule.handle.mock.calls[0][0]).toEqual('storeSupportabilityMetrics')
      expect(handleModule.handle.mock.calls[0][1]).toEqual(['API/logging/info/called'])
      expect(handleModule.handle.mock.calls[1][0]).toEqual('log')
      expect(handleModule.handle.mock.calls[1][1]).toEqual([expect.any(Number), 'testMessage', { test1: 1, test2: true, test3: { nested: true } }, 'INFO'])
    })
    it('should buffer logs with message, custom attributes, and custom level', () => {
      bufferLog(ee.get(agentIdentifier), 'testMessage', { test1: 1, test2: true, test3: { nested: true } }, 'ERROR')
      expect(handleModule.handle.mock.calls[0][0]).toEqual('storeSupportabilityMetrics')
      expect(handleModule.handle.mock.calls[0][1]).toEqual(['API/logging/error/called'])
      expect(handleModule.handle.mock.calls[1][0]).toEqual('log')
      expect(handleModule.handle.mock.calls[1][1]).toEqual([expect.any(Number), 'testMessage', { test1: 1, test2: true, test3: { nested: true } }, 'ERROR'])
    })
  })

  describe('isValidLogLevel', () => {
    test('should detect valid and invalid log levels', () => {
      const logLevels = ['info', 'trace', 'debug', 'warn', 'error']
      const invalidLogLevels = ['', 'bad', true, false, {}, []]

      // must be case-changed to upper first
      expect(logLevels.every(level => isValidLogLevel(level))).toEqual(false)
      // this should pass since it is case changed
      expect(logLevels.map(x => x.toUpperCase()).every(level => isValidLogLevel(level))).toEqual(true)
      expect(invalidLogLevels.every(level => !isValidLogLevel(level))).toEqual(true)
    })
  })
})
