import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { bufferLog } from '../../../src/features/logging/shared/utils'
import * as handleModule from '../../../src/common/event-emitter/handle'

const agentIdentifier = 'abcd'
describe('logging utils component tests', () => {
  beforeEach(() => {
    jest.spyOn(handleModule, 'handle')
  })
  describe('bufferLog', () => {
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
})
