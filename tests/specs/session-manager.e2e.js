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
    // await browser.execute(function () { window.localStorage.clear() })
  })

  afterEach(async () => {
    await testHandle.destroy()
  })

  describe('data is stored in storage API --', () => {
    it('should store session data in local storage by default', async () => {
      const url = await testHandle.assetURL('instrumented.html', { init })
      await browser.url(url)
      await waitForLoad(browser)
      const storedData = await browser.execute(getLocalStorageData)

      expect(storedData).toEqual(expect.objectContaining({
        value: expect.any(String),
        expiresAt: expect.any(Number),
        inactiveAt: expect.any(Number),
        sessionReplayActive: expect.any(Boolean),
        sessionTraceActive: expect.any(Boolean)
      }))
    })
  })

  describe('persist across different navigations -- ', () => {
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

  describe('session expirations -- ', () => {
    it('should set a new session after expiring', async () => {
      const expiresMs = 2000
      const url = await testHandle.assetURL('instrumented.html', { init: { ...init, session: { expiresMs } } })
      await browser.url(url)
      await waitForLoad(browser)

      const lsData = await browser.execute(getLocalStorageData)
      const cData = await browser.execute(getClassData)
      expect(lsData).toEqual(cData)
      expect(lsData.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      expect(lsData.inactiveAt).toEqual(expect.any(Number))

      // wait longer than the expiresMs
      await wait(3000)

      const lsData2 = await browser.execute(getLocalStorageData)
      const cData2 = await browser.execute(getLocalStorageData)

      expect(lsData2).toEqual(cData2)
      expect(lsData2.value).not.toEqual(lsData.value)
      expect(lsData2.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
    })

    it('should set a new session after inactivity', async () => {
      const inactiveMs = 2000
      const url = await testHandle.assetURL('instrumented.html', { init: { ...init, session: { inactiveMs } } })
      await browser.url(url)
      await waitForLoad(browser)

      const lsData = await browser.execute(getLocalStorageData)
      const cData = await browser.execute(getClassData)
      expect(lsData).toEqual(cData)
      expect(lsData.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      expect(lsData.inactiveAt).toEqual(expect.any(Number))

      // wait longer than the inactiveMs
      await wait(3000)

      const lsData2 = await browser.execute(getLocalStorageData)
      const cData2 = await browser.execute(getLocalStorageData)

      expect(lsData2).toEqual(cData2)
      expect(lsData2.value).not.toEqual(lsData.value)
      expect(lsData2.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
    })
  })

  describe('Interactivity behavior -- ', () => {
    it('should update inactiveTimers if page is clicked', async () => {
      const inactiveMs = 7500
      const url = await testHandle.assetURL('instrumented.html', { init: { ...init, session: { inactiveMs } } })
      await browser.url(url)
      await waitForLoad(browser)

      const lsData = await browser.execute(getLocalStorageData)
      const cData = await browser.execute(getClassData)
      expect(lsData).toEqual(cData)
      expect(lsData.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      expect(lsData.inactiveAt).toEqual(expect.any(Number))

      const refreshedAt = await browser.execute(function () {
        document.querySelector('body').click()
        return Date.now()
      })
      await wait(1000)

      const lsData2 = await browser.execute(getLocalStorageData)
      const cData2 = await browser.execute(getLocalStorageData)

      expect(lsData2).toEqual(cData2)
      expect(lsData2.value).toEqual(lsData.value)
      expect(lsData2.inactiveAt).not.toEqual(lsData.inactiveAt)
      expect(lsData2.inactiveAt - refreshedAt).toBeGreaterThan(0)
      expect(Math.abs(lsData2.inactiveAt - refreshedAt - 7500)).toBeLessThan(1000)
    })

    it('should update inactiveTimers if page is scrolled', async () => {
      const inactiveMs = 7500
      const url = await testHandle.assetURL('instrumented.html', { init: { ...init, session: { inactiveMs } } })
      await browser.url(url)
      await waitForLoad(browser)

      const lsData = await browser.execute(getLocalStorageData)
      const cData = await browser.execute(getClassData)
      expect(lsData).toEqual(cData)
      expect(lsData.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      expect(lsData.inactiveAt).toEqual(expect.any(Number))

      const refreshedAt = await browser.execute(function () {
        document.dispatchEvent(new CustomEvent('scroll'))
        return Date.now()
      })
      await wait(1000)

      const lsData2 = await browser.execute(getLocalStorageData)
      const cData2 = await browser.execute(getLocalStorageData)

      expect(lsData2).toEqual(cData2)
      expect(lsData2.value).toEqual(lsData.value)
      expect(lsData2.inactiveAt).not.toEqual(lsData.inactiveAt)
      expect(lsData2.inactiveAt - refreshedAt).toBeGreaterThan(0)
      expect(Math.abs(lsData2.inactiveAt - refreshedAt - 7500)).toBeLessThan(1000)
    })

    it('should update inactiveTimers if page is keydowned', async () => {
      const inactiveMs = 7500
      const url = await testHandle.assetURL('instrumented.html', { init: { ...init, session: { inactiveMs } } })
      await browser.url(url)
      await waitForLoad(browser)

      const lsData = await browser.execute(getLocalStorageData)
      const cData = await browser.execute(getClassData)
      expect(lsData).toEqual(cData)
      expect(lsData.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      expect(lsData.inactiveAt).toEqual(expect.any(Number))

      const refreshedAt = await browser.execute(function () {
        document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Q', char: 'Q', shiftKey: true }))
        return Date.now()
      })
      await wait(1000)

      const lsData2 = await browser.execute(getLocalStorageData)
      const cData2 = await browser.execute(getLocalStorageData)

      expect(lsData2).toEqual(cData2)
      expect(lsData2.value).toEqual(lsData.value)
      expect(lsData2.inactiveAt).not.toEqual(lsData.inactiveAt)
      expect(lsData2.inactiveAt - refreshedAt).toBeGreaterThan(0)
      expect(Math.abs(lsData2.inactiveAt - refreshedAt - 7500)).toBeLessThan(1000)
    })

    it('inactiveAt is managed in local storage across loads', async () => {
      const inactiveMs = 7500
      const url = await testHandle.assetURL('instrumented.html', { init: { ...init, session: { inactiveMs } } })
      await browser.url(url)
      await waitForLoad(browser)

      const lsData = await browser.execute(getLocalStorageData)
      const cData = await browser.execute(getClassData)
      expect(lsData).toEqual(cData)
      expect(lsData.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      expect(lsData.inactiveAt).toEqual(expect.any(Number))

      const refreshedAt = await browser.execute(function () {
        document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Q', char: 'Q', shiftKey: true }))
        return Date.now()
      })
      await wait(1000)
      await browser.url(url)
      await waitForLoad(browser)

      const lsData2 = await browser.execute(getLocalStorageData)
      const cData2 = await browser.execute(getLocalStorageData)

      expect(lsData2).toEqual(cData2)
      expect(lsData2.value).toEqual(lsData.value)
      expect(lsData2.inactiveAt).not.toEqual(lsData.inactiveAt)
      expect(lsData2.inactiveAt - refreshedAt).toBeGreaterThan(0)
      expect(Math.abs(lsData2.inactiveAt - refreshedAt - 7500)).toBeLessThan(1000)
    })
  })

  describe('Custom attributes', () => {
    it('should be able to set custom attributes', async () => {
      const url = await testHandle.assetURL('instrumented.html', { init })
      await browser.url(url)
      await waitForLoad(browser)

      let data = await browser.execute(getAllClassData)
      let lsData = await browser.execute(getLocalStorageData)
      expect(data.custom).toBeFalsy()
      expect(data.custom).toEqual(lsData.custom)

      await browser.execute(function () {
        newrelic.setCustomAttribute('test', 1, true)
      })

      data = await browser.execute(getAllClassData)
      expect(data.custom).toEqual({ test: 1 })

      lsData = await browser.execute(getLocalStorageData)
      expect(lsData.custom).toEqual(data.custom)
    })
  })

  describe('Misc class attributes -- ', () => {
    it('class should attribute for new sessions', async () => {
      const url = await testHandle.assetURL('instrumented.html', { init })
      await browser.url(url)
      await waitForLoad(browser)

      let data = await browser.execute(getAllClassData)
      expect(data.isNew).toEqual(true)

      await wait(1000)
      await browser.url(url)

      data = await browser.execute(getAllClassData)
      expect(data.isNew).toEqual(false)
    })

    it('class should flag as initialized', async () => {
      const url = await testHandle.assetURL('instrumented.html', { init })
      await browser.url(url)
      await waitForLoad(browser)

      let data = await browser.execute(getAllClassData)
      expect(data.initialized).toEqual(true)
    })
  })

  describe('Reset --', () => {
    it('should notify when resetting', async () => {
      const url = await testHandle.assetURL('instrumented.html', { init })
      await browser.url(url)
      await waitForLoad(browser)
      await browser.execute(function () {
        window.wasReset = false
        newrelic.ee.on('session-reset', function () {
          window.wasReset = true
        })
      })

      const wasReset = await browser.execute(function () {
        return window.wasReset
      })
      expect(wasReset).toEqual(true)
    })
  })
})

function getLocalStorageData () {
  return JSON.parse(window.localStorage.getItem('NRBA_SESSION') || '{}')
}

function getClassData () {
  var output = {}
  try {
    for (key in newrelic.initializedAgents) {
      output = newrelic.initializedAgents[key].runtime.session
    }
  } catch (err) {}
  return {
    value: output.value,
    inactiveAt: output.inactiveAt,
    expiresAt: output.expiresAt,
    sessionReplayActive: output.sessionReplayActive,
    sessionTraceActive: output.sessionTraceActive
  }
}

function getAllClassData () {
  var output = {}
  try {
    for (key in newrelic.initializedAgents) {
      for (k in newrelic.initializedAgents[key].runtime.session) {
        if (typeof newrelic.initializedAgents[key].runtime.session[k] !== 'object') output[k] = newrelic.initializedAgents[key].runtime.session[k]
      }
    }
  } catch (err) {}
  return output
}

function resetSession () {
  try {
    for (key in newrelic.initializedAgents) {
      newrelic.initializedAgents[key].runtime.session.reset()
    }
  } catch (err) {
  // do nothing
  }
}

function waitForLoad (browser) {
  return browser.waitUntil(
    () => browser.execute(() => document.readyState === 'complete'),
    {
      timeout: 10000, // 10 seconds
      timeoutMsg: 'Window didnt load in time'
    }
  )
}
