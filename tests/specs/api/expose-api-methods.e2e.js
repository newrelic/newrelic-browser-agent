describe('newrelic api', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should expose api methods', async () => {
    await browser.url(await browser.testHandle.assetURL('api/local-storage-disallowed.html')) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    const globalApiMethods = await browser.execute(function () {
      return Object.keys(window.newrelic)
    })
    const agentInstanceApiMethods = await browser.execute(function () {
      function getAllPropertyNames (obj) {
        var result = new Set()
        while (obj) {
          Object.getOwnPropertyNames(obj).forEach(function (p) {
            return result.add(p)
          })
          obj = Object.getPrototypeOf(obj)
        }
        return Array.from(result)
      }
      return getAllPropertyNames(Object.values(newrelic.initializedAgents)[0].api)
    })

    const apiSeen = {
      setErrorHandler: false,
      finished: false,
      addToTrace: false,
      addRelease: false,
      addPageAction: false,
      recordCustomEvent: false,
      setCurrentRouteName: false,
      setPageViewName: false,
      setCustomAttribute: false,
      interaction: false,
      noticeError: false,
      setUserId: false,
      setApplicationVersion: false,
      start: false,
      recordReplay: false,
      pauseReplay: false,
      log: false,
      wrapLogger: false,
      register: false,
      consent: false
    }
    globalApiMethods.forEach(keyName => {
      if (apiSeen[keyName] !== undefined) apiSeen[keyName] = true
    })

    expect(Object.values(apiSeen).every(x => x)).toEqual(true)

    Object.keys(apiSeen).forEach(keyName => {
      apiSeen[keyName] = false
    })

    agentInstanceApiMethods.forEach(keyName => {
      if (apiSeen[keyName] !== undefined) apiSeen[keyName] = true
    })

    expect(Object.values(apiSeen).every(x => x)).toEqual(true)
  })
})
