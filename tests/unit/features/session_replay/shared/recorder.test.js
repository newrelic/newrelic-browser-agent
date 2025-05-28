import { Recorder } from '../../../../../src/features/session_replay/shared/recorder'

describe('recorder', () => {
  // it's possible for events collection to start before session is initialized
  test('should store event if no session present', async () => {
    const event = { timestamp: 123 }
    const recorder = new Recorder({
      agentRef: {
        init: {
          session_replay: {
            stylesheets: true
          }
        },
        runtime: {}
      },
      ee: {
        emit: () => {}
      }
    })

    recorder.store(event)

    expect(recorder.getEvents().events).toHaveLength(1)
  })
})
