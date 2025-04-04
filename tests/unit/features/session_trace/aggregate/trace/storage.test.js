import { TraceStorage } from '../../../../../../src/features/session_trace/aggregate/trace/storage'

describe('session trace storage', () => {
  test('should not store trace node if past session expiry', async () => {
    const traceNode = {
      n: 'someName',
      s: 123,
      e: 124,
      o: 'someOrigin',
      t: 'someType'
    }
    const traceStorage = new TraceStorage({
      timeKeeper: {
        ready: true,
        convertRelativeTimestamp: () => { return 123 }
      },
      agentRef: {
        init: { },
        runtime: {
          session: {
            state: {
              expiresAt: 123
            },
            isAfterSessionExpiry: () => true
          }
        }
      }
    })

    traceStorage.storeSTN(traceNode)

    expect(traceStorage.isEmpty()).toBe(true)
  })
})
