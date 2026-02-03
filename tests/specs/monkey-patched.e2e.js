describe('monkey-patched globals', () => {
  it('should warn if the performance.now globals are monkey-patched (NR-435349)', async () => {
    const url = await browser.testHandle.assetURL('monkey-patched.html')
    await browser.url(url).then(() => browser.waitForAgentLoad())

    const logs = await browser.execute(function () {
      return window.logs
    })

    expect(logs[0][0].includes('New Relic Warning') && logs[0][0].includes('64')).toEqual(true) // 64 is the warning code for monkey-patched globals
    expect(logs[0][1]).toEqual('debug')

    expect(logs[1][0].includes('New Relic Warning') && logs[1][0].includes('64')).toEqual(true) // 64 is the warning code for monkey-patched globals
    expect(logs[1][1]).toEqual('function (){ \n        return origPerformanceNow.apply(performance, arguments);}')
  })

  it('should NOT warn if the monkey-patched function is nrWrapper', async () => {
    const url = await browser.testHandle.assetURL('monkey-patched-2-agents.html')
    await browser.url(url).then(() => browser.waitForAgentLoad())

    const logs = await browser.execute(function () {
      return window.logs
    })

    expect(logs[0][0].includes('New Relic Warning') && logs[0][0].includes('64')).toEqual(true) // 64 is the warning code for monkey-patched globals
    expect(logs[0][1]).toEqual('debug')

    expect(logs[1][0].includes('New Relic Warning') && logs[1][0].includes('69')).toEqual(true) // 69 is the warning code for multiple agents on page
    expect(logs[1][1]).toEqual(null)

    expect(logs.filter(log => log[1]?.includes('nrWrapper')).length).toEqual(0) // should not have logged anything about nrWrapper
  })
})
