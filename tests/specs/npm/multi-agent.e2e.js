/* globals MicroAgent */

describe('multi-agent', () => {
  it('has a single interaction response on top-level spa api interaction call', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/multi-agent.html'))

    const ixn = await browser.execute(function () {
      var opts = {
        info: NREUM.info,
        init: NREUM.init
      }
      window.agent1 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 1 } })

      // micro-agents are forbidden to respond to a top-level api call, so only the non-micro agent's interaction should exist
      return window.newrelic.interaction()
    })

    // a single interaction should have api methods defined on them
    expect(ixn.get).toBeDefined()
  })

  it('emits a single console log warning when more than one agent is on the page', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/multi-agent.html'))

    // register two micro agents alongside the main agent
    await browser.execute(function () {
      var opts = {
        info: NREUM.info,
        init: NREUM.init
      }
      window.agent1 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 1 } })
      window.agent2 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 2 } })
    })

    // wait for agents to register and log warnings
    await browser.pause(5000)

    const agentLogCount = await browser.execute(function () {
      return window.test.agentLogCount
    })

    // there should only be one agent log warning
    expect(agentLogCount).toBe(1)
  })
})
