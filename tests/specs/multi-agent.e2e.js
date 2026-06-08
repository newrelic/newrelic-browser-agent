describe('multi-agent', () => {
  it('emits a single console log warning when more than one agent is on the page', async () => {
    await browser.url(await browser.testHandle.assetURL('multi-agent.html'))

    // wait for agents to register and log warnings
    await browser.pause(5000)

    const agentLogCount = await browser.execute(function () {
      return window.test.agentLogCount
    })

    // there should only be one agent log warning
    expect(agentLogCount).toBe(1)
  })
})
