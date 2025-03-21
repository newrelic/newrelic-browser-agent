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
})
