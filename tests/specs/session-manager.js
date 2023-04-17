
describe('newrelic session ID', () => {
  let testHandle
  const init = {
    ajax: { deny_list: [], harvestTimeSeconds: 5 },
    jserrors: { harvestTimeSeconds: 5 },
    metrics: { harvestTimeSeconds: 5 },
    page_action: { harvestTimeSeconds: 5 },
    page_view_timing: { harvestTimeSeconds: 5 },
    session_trace: { harvestTimeSeconds: 5 },
    spa: { harvestTimeSeconds: 5 }
  }

  beforeEach(async () => {
    testHandle = await browser.getTestHandle()
  })

  afterEach(async () => {
    await testHandle.destroy()
  })

  describe('persist across different navigations', () => {
    it('should keep a session id across page loads', async () => {
      const url = await testHandle.assetURL('instrumented.html', { init })

      let [{ request: { query: firstQuery } }] = await Promise.all([
        testHandle.expectRum(),
        browser.url(url)
      ])
      const firstSessionId = firstQuery.s
      expect(firstSessionId).toBeTruthy()

      let [{ request: { query: secondQuery } }] = await Promise.all([
        testHandle.expectRum(),
        browser.refresh()
      ])
      const secondSessionId = secondQuery.s
      expect(secondSessionId).toBeTruthy()
      expect(secondSessionId).toEqual(firstSessionId)
    })

    it('should keep a session id across same tab navigations', async () => {
      const url = await testHandle.assetURL('instrumented.html', { init })

      let [{ request: { query: firstQuery } }] = await Promise.all([
        testHandle.expectRum(),
        browser.url(url)
      ])
      const firstSessionId = firstQuery.s
      expect(firstSessionId).toBeTruthy()

      let [{ request: { query: secondQuery } }] = await Promise.all([
        testHandle.expectRum(),
        browser.url(await testHandle.assetURL('fetch.html', { init }))
      ])
      const secondSessionId = secondQuery.s
      expect(secondSessionId).toBeTruthy()
      expect(secondSessionId).toEqual(firstSessionId)
    })

    it('should keep a session id across multi tab navigations', async () => {
      const url = await testHandle.assetURL('instrumented.html', { init })
      const secondUrl = await testHandle.assetURL('instrumented.html', { init })

      let [{ request: { query: firstQuery } }] = await Promise.all([
        testHandle.expectRum(),
        browser.url(url)
      ])
      const firstSessionId = firstQuery.s
      expect(firstSessionId).toBeTruthy()

      let [{ request: { query: secondQuery } }] = await Promise.all([
        testHandle.expectRum(),
        browser.newWindow(secondUrl)
      ])

      browser.switchWindow(secondUrl)
      const secondSessionId = secondQuery.s
      expect(secondSessionId).toBeTruthy()
      expect(secondSessionId).toEqual(firstSessionId)
    })
  })
})
