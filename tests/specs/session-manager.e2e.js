const wait = require('./test-utils/wait')

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

  describe('session expirations', () => {
    it('should set a new session after expiring in same load', async () => {
      const url = await testHandle.assetURL('instrumented.html', { init: { ...init, session: { expiresMs: 1000 } } })

      const [{ request: { query: { s: rumID } } }, { request: { query: { s: ajaxID1 } } }] = await Promise.all([
        testHandle.expectRum(),
        testHandle.expectAjaxEvents(),
        browser.url(url)
      ])
      // the rum call happens before the 1000ms expire time
      console.log('rumID', rumID)
      expect(rumID).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      // ajax should forcefully "unload" when the session is reset at 1000ms
      console.log('ajaxID1', ajaxID1)
      expect(ajaxID1).toEqual(rumID)
      expect(ajaxID1).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      // then... 1000 ms should have expired the session before the next default ajax harvest time (5000ms)
      const { request: { query: { s: ajaxID2 } } } = await testHandle.expectAjaxEvents()
      console.log('ajaxID2', ajaxID2)
      expect(ajaxID2).not.toEqual(ajaxID1)
      expect(ajaxID2).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
    })

    it('should set a new session after expiring on new page load', async () => {
      const url = await testHandle.assetURL('instrumented.html', { init: { ...init, session: { expiresMs: 1000 } } })

      const [{ request: { query: { s: firstSessionID } } }] = await Promise.all([
        testHandle.expectRum(),
        browser.url(url)
      ])
      expect(firstSessionID).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))

      await wait(2000)
      const [{ request: { query: { s: secondSessionID } } }] = await Promise.all([
        testHandle.expectRum(),
        browser.refresh()
      ])
      expect(secondSessionID).not.toEqual(firstSessionID)
      expect(secondSessionID).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
    })
  })
})
