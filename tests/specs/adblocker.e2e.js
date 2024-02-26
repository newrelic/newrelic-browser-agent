const config = {
  init: {
    privacy: { cookies_enabled: true }
  }
}

describe('adblocker', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should abort the global event emitter when rum call is blocked', async () => {
    await browser.url(await browser.testHandle.assetURL('adblocker-ingest.html', config))
    await browser.waitUntil(() => browser.execute(function () {
      const agentEE = Object.values(newrelic.initializedAgents)[0].ee
      return agentEE.aborted
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

      const agentEE = Object.values(newrelic.initializedAgents)[0].ee

      Object.entries(agentEE.backlog).forEach(function (bl) {
        if (Array.isArray(bl[1]) && bl[1].length > 0) {
          eeCleared.result = false
          eeCleared.errors.push('newrelic.ee.backlog[' + bl[0] + '] not cleared: ' + bl[1].length + ' entries')
        }
      })

      Object.values(newrelic.initializedAgents).forEach(function (agent) {
        Object.entries(agent.features).forEach(function (feat) {
          if (feat[1].ee.backlog !== agentEE.backlog) {
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
    await browser.url(await browser.testHandle.assetURL('adblocker-assets.html', config))

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
