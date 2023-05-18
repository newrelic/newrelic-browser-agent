import { config } from '../util/defaults'

describe('newrelic session ID', () => {
  let testHandle
  const anySession = () => ({
    value: expect.any(String),
    expiresAt: expect.any(Number),
    inactiveAt: expect.any(Number),
    updatedAt: expect.any(Number),
    sessionReplayActive: expect.any(Boolean),
    sessionTraceActive: expect.any(Boolean),
    custom: expect.any(Object)
  })

  beforeEach(async () => {
    testHandle = await browser.getTestHandle()
  })

  afterEach(async () => {
    // Go to the index page and clear the local storage
    await browser.url(await testHandle.assetURL('/'))
    await browser.execute(function () { window.localStorage.clear() })

    await testHandle.destroy()
  })

  describe('data is stored in storage API', () => {
    it('should store session data in local storage by default', async () => {
      await Promise.all([
        testHandle.expectRum(),
        browser.url(await testHandle.assetURL('session-entity.html', config)) // Setup expects before loading the page
      ])

      const storedData = await browser.execute(getLocalStorageData)

      expect(storedData).toEqual(anySession())
    })
  })

  describe('persist across different navigations -- ', () => {
    it('should keep a session id across page loads - Refresh', async () => {
      await Promise.all([
        testHandle.expectRum(),
        browser.url(await testHandle.assetURL('session-entity.html', config)) // Setup expects before loading the page
      ])

      const ls1 = await browser.execute(getLocalStorageData)
      expect(ls1).toEqual(anySession())

      await Promise.all([
        testHandle.expectRum(),
        browser.refresh() // Setup expects before loading the page
      ])

      const ls2 = await browser.execute(getLocalStorageData)
      expect(ls2).toEqual(anySession())
      expect(ls2.value).toEqual(ls1.value)
      expect(ls2.expiresAt).toEqual(ls1.expiresAt)
    })

    it('should keep a session id across page loads - Same tab navigation', async () => {
      await Promise.all([
        testHandle.expectRum(),
        browser.url(await testHandle.assetURL('session-entity.html', config)) // Setup expects before loading the page
      ])

      const ls1 = await browser.execute(getLocalStorageData)
      expect(ls1).toEqual(anySession())

      await Promise.all([
        testHandle.expectRum(),
        browser.url(await testHandle.assetURL('fetch.html', config)) // Setup expects before loading the page
      ])

      const ls2 = await browser.execute(getLocalStorageData)
      expect(ls2).toEqual(anySession())
      expect(ls2.value).toEqual(ls1.value)
      expect(ls2.expiresAt).toEqual(ls1.expiresAt)
    })

    it('should keep a session id across page loads - Multi tab navigation', async () => {
      await Promise.all([
        testHandle.expectRum(),
        browser.url(await testHandle.assetURL('session-entity.html', config)) // Setup expects before loading the page
      ])

      const ls1 = await browser.execute(getLocalStorageData)
      expect(ls1).toEqual(anySession())

      await Promise.all([
        testHandle.expectRum(),
        browser.execute(function () { window.open('/') }) // Setup expects before loading the page
      ])
      await browser.switchWindow('http://bam-test-1.nr-local.net')

      const ls2 = await browser.execute(getLocalStorageData)
      expect(ls2).toEqual(anySession())
      expect(ls2.value).toEqual(ls1.value)
      expect(ls2.expiresAt).toEqual(ls1.expiresAt)
    })
  })

  // describe('session expirations -- ', () => {
  //   it('should set a new session after expiring', async () => {
  //     const expiresMs = 5000
  //     const url = await testHandle.assetURL('fetch.html', { init: { ...init, session: { expiresMs } } })
  //     await browser.url(url)
  //     await browser.waitForFeature('loaded')
  //     await browser.execute(function () { window.localStorage.clear() })
  //     await browser.execute(resetSession)

  //     const lsData = await browser.execute(getLocalStorageData)
  //     const cData = await browser.execute(getClassData)

  //     expect(lsData).toEqual(cData)
  //     expect(lsData.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
  //     expect(lsData.inactiveAt).toEqual(expect.any(Number))

  //     // wait longer than the expiresMs
  //     await browser.pause(expiresMs + 1000)

  //     const lsData2 = await browser.execute(getLocalStorageData)
  //     const cData2 = await browser.execute(getClassData)

  //     expect(lsData2).toEqual(cData2)
  //     expect(lsData2.value).not.toEqual(lsData.value)
  //     expect(lsData2.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
  //   })

  //   it('should set a new session after inactivity', async () => {
  //     const inactiveMs = 10000
  //     const url = await testHandle.assetURL('session-entity.html', { init: { ...init, session: { inactiveMs } } })
  //     await browser.url(url)
  //     await browser.waitForFeature('loaded')
  //     await browser.execute(function () { window.localStorage.clear() })
  //     await browser.execute(resetSession)

  //     const lsData = await browser.execute(getLocalStorageData)
  //     const cData = await browser.execute(getClassData)
  //     expect(lsData).toEqual(cData)
  //     expect(lsData.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
  //     expect(lsData.inactiveAt).toEqual(expect.any(Number))

  //     // wait longer than the inactiveMs
  //     await browser.pause(inactiveMs + 1000)

  //     const lsData2 = await browser.execute(getLocalStorageData)
  //     const cData2 = await browser.execute(getClassData)

  //     expect(lsData2).toEqual(cData2)
  //     expect(lsData2.value).not.toEqual(lsData.value)
  //     expect(lsData2.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
  //   })
  // })

  // describe('Interactivity behavior -- ', () => {
  //   it('should update inactiveTimers if page is interacted with', async () => {
  //     const inactiveMs = 7500
  //     const url = await testHandle.assetURL('session-entity.html', { init: { ...init, session: { inactiveMs } } })
  //     await browser.url(url)
  //     await browser.waitForFeature('loaded')

  //     const lsData = await browser.execute(getLocalStorageData)
  //     const cData = await browser.execute(getClassData)
  //     expect(lsData).toEqual(cData)
  //     expect(lsData.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
  //     expect(lsData.inactiveAt).toEqual(expect.any(Number))

  //     const refreshedAt = await browser.execute(function () {
  //       document.querySelector('body').click()
  //       return Date.now()
  //     })
  //     await browser.pause(500)
  //     const lsData2 = await browser.execute(getLocalStorageData)
  //     const cData2 = await browser.execute(getClassData)

  //     expect(lsData2).toEqual(cData2)
  //     expect(lsData2.value).toEqual(lsData.value)
  //     expect(lsData2.inactiveAt).not.toEqual(lsData.inactiveAt)
  //     expect(lsData2.inactiveAt - refreshedAt).toBeGreaterThan(0)
  //   })

  //   it('inactiveAt is managed in local storage across loads', async () => {
  //     const inactiveMs = 7500
  //     const url = await testHandle.assetURL('session-entity.html', { init: { ...init, session: { inactiveMs } } })
  //     await browser.url(url)
  //     await browser.waitForFeature('loaded')

  //     const lsData = await browser.execute(getLocalStorageData)
  //     const cData = await browser.execute(getClassData)
  //     expect(lsData).toEqual(cData)
  //     expect(lsData.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
  //     expect(lsData.inactiveAt).toEqual(expect.any(Number))

  //     const refreshedAt = await browser.execute(function () {
  //       document.querySelector('body').click()
  //       return Date.now()
  //     })
  //     await browser.url(await testHandle.assetURL('fetch.html', { init: { ...init, session: { inactiveMs } } }))
  //     await browser.waitForFeature('loaded')

  //     const lsData2 = await browser.execute(getLocalStorageData)
  //     const cData2 = await browser.execute(getClassData)

  //     expect(lsData2).toEqual(cData2)
  //     expect(lsData2.value).toEqual(lsData.value)
  //     expect(lsData2.inactiveAt).not.toEqual(lsData.inactiveAt)
  //     expect(lsData2.inactiveAt - refreshedAt).toBeGreaterThan(0)
  //   })
  // })

  // describe('Custom attributes', () => {
  //   it('should be able to set custom attributes', async () => {
  //     const url = await testHandle.assetURL('session-entity.html', { init })
  //     await browser.url(url)
  //     await browser.waitForFeature('loaded')

  //     let lsData = await browser.execute(getLocalStorageData)
  //     let data = await browser.execute(getAllClassData)
  //     expect(lsData.custom).toEqual({})
  //     expect(data.custom).toEqual({})
  //     expect(data.custom).toEqual(lsData.custom)

  //     await browser.execute(function () {
  //       newrelic.setCustomAttribute('test', 1, true)
  //     })

  //     lsData = await browser.execute(getLocalStorageData)
  //     expect(lsData.custom).toEqual({ test: 1 })

  //     data = await browser.execute(getAllClassData)
  //     expect(data.custom).toEqual({ test: 1 })
  //   })
  // })

  // describe('Misc class attributes -- ', () => {
  //   it('class should flag as initialized', async () => {
  //     const url = await testHandle.assetURL('session-entity.html', { init })
  //     await browser.url(url)
  //     await browser.waitForFeature('loaded')

  //     let data = await browser.execute(getAllClassData)
  //     expect(data.initialized).toEqual(true)
  //   })
  // })

  // describe('Reset --', () => {
  //   it('should notify when resetting', async () => {
  //     const url = await testHandle.assetURL('session-entity.html', { init })
  //     await browser.url(url)
  //     await browser.waitForFeature('loaded')
  //     await browser.execute(function () {
  //       window.wasReset = false
  //       newrelic.ee.on('session-reset', function () {
  //         window.wasReset = true
  //       })
  //     })

  //     await browser.execute(resetSession)

  //     const wasReset = await browser.execute(function () {
  //       return window.wasReset
  //     })
  //     expect(wasReset).toEqual(true)
  //   })
  // })
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
    updatedAt: output.updatedAt,
    sessionReplayActive: output.sessionReplayActive,
    sessionTraceActive: output.sessionTraceActive,
    ...(output.custom && { custom: output.custom })
  }
}

function getAllClassData () {
  var output = {}
  try {
    for (key in newrelic.initializedAgents) {
      for (k in newrelic.initializedAgents[key].runtime.session) {
        if (typeof newrelic.initializedAgents[key].runtime.session[k] !== 'object' || k === 'custom') output[k] = newrelic.initializedAgents[key].runtime.session[k]
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
