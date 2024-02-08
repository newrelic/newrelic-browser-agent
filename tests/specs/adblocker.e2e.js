import { config } from './session-replay/helpers'

describe('adblocker', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should abort the global event emitter when rum call is blocked', async () => {
    await browser.url(await browser.testHandle.assetURL('adblocker-ingest.html', config({ session_replay: { sampling_rate: 100, error_sampling_rate: 100 } })))

    await browser.waitUntil(() => browser.execute(function () {
      return newrelic.ee.aborted
    }), {
      timeoutMsg: 'expected global event emitter to abort'
    })

    // Simulate adding an item to the event emitter backlog
    await browser.execute(function () {
      newrelic.addRelease('foobar', 'bizbaz')
    })

    const eventEmitterBufferCleared = await browser.execute(function () {
      var eeCleared = {
        result: true,
        errors: []
      }

      Object.entries(newrelic.ee.backlog).forEach(function (bl) {
        if (Array.isArray(bl[1]) && bl[1].length > 0) {
          eeCleared.result = false
          eeCleared.errors.push('newrelic.ee.backlog[' + bl[0] + '] not cleared: ' + bl[1].length + ' entries')
        }
      })

      Object.values(newrelic.initializedAgents).forEach(function (agent) {
        Object.entries(agent.features).forEach(function (feat) {
          if (feat[1].ee.backlog !== newrelic.ee.backlog) {
            eeCleared.result = false
            eeCleared.errors.push('feature ' + feat[0] + ' backlog is not global backlog')
          }
        })
      })

      return eeCleared
    })

    expect(eventEmitterBufferCleared.result).toEqual(true)
    expect(eventEmitterBufferCleared.errors).toEqual([])
  })

  it('should drain and null out all event emitter buffers when assets fail to load', async () => {
    await browser.url(await browser.testHandle.assetURL('adblocker-assets.html', config({ session_replay: { sampling_rate: 100, error_sampling_rate: 100 } })))

    await browser.waitUntil(() => browser.execute(function () {
      var eeBacklogNulled = true

      Object.values(newrelic.ee.backlog).forEach(function (bl) {
        if (bl !== null) {
          eeBacklogNulled = false
        }
      })

      return eeBacklogNulled
    }), {
      timeoutMsg: 'expected global event emitter backlog to be nulled'
    })
  })
})
