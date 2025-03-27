import { Recorder } from '../../../../../src/features/session_replay/shared/recorder'

describe('recorder', () => {
  test('should not store event if past session expiry', async () => {
    const event = { timestamp: 123 }
    const recorder = new Recorder({
      agentRef: {
        init: {
          session_replay: {
            stylesheets: true
          }
        },
        runtime: {
          session: {
            state: {
              expiresAt: 123
            }
          }
        }
      }
    })

    recorder.store(event)

    expect(recorder.getEvents().events).toHaveLength(0)
  })
})
