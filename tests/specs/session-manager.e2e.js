import { notSafari, supportsMultipleTabs } from '../../tools/browser-matcher/common-matchers.mjs'
import { testErrorsRequest } from '../../tools/testing-server/utils/expect-tests'

const config = {
  init: {
    privacy: { cookies_enabled: true }
  }
}

describe('newrelic session ID', () => {
  const anySession = () => ({
    value: expect.any(String),
    expiresAt: expect.any(Number),
    inactiveAt: expect.any(Number),
    updatedAt: expect.any(Number),
    sessionReplayMode: expect.any(Number),
    sessionReplaySentFirstChunk: expect.any(Boolean),
    sessionTraceMode: expect.any(Number),
    traceHarvestStarted: expect.any(Boolean),
    custom: expect.any(Object),
    serverTimeDiff: expect.any(Number)
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  describe('data is stored in storage API', () => {
    it('should store session data in local storage by default', async () => {
      await browser.url(await browser.testHandle.assetURL('session-entity.html', config))
        .then(() => browser.waitForAgentLoad())

      const { localStorage } = await browser.getAgentSessionInfo()

      expect(localStorage).toEqual(anySession())
    })
  })

  describe('persist across different navigation', () => {
    it('should keep a session id across page loads - Refresh', async () => {
      await browser.url(await browser.testHandle.assetURL('session-entity.html', config))
        .then(() => browser.waitForAgentLoad())

      const { localStorage: ls1 } = await browser.getAgentSessionInfo()
      expect(ls1).toEqual(anySession())

      await browser.refresh()
        .then(() => browser.waitForAgentLoad())

      const { localStorage: ls2 } = await browser.getAgentSessionInfo()
      expect(ls2).toEqual(anySession())
      expect(ls2.value).toEqual(ls1.value)
      expect(ls2.expiresAt).toEqual(ls1.expiresAt)
    })

    it('should keep a session id across page loads - Same tab navigation', async () => {
      await browser.url(await browser.testHandle.assetURL('session-entity.html', config))
        .then(() => browser.waitForAgentLoad())

      const { localStorage: ls1 } = await browser.getAgentSessionInfo()
      expect(ls1).toEqual(anySession())

      await browser.url(await browser.testHandle.assetURL('fetch.html', config))
        .then(() => browser.waitForAgentLoad())

      const { localStorage: ls2 } = await browser.getAgentSessionInfo()
      expect(ls2).toEqual(anySession())
      expect(ls2.value).toEqual(ls1.value)
      expect(ls2.expiresAt).toEqual(ls1.expiresAt)
    })

    it.withBrowsersMatching([supportsMultipleTabs, notSafari])('should keep a session id across page loads - Multi tab navigation', async () => {
      await browser.url(await browser.testHandle.assetURL('session-entity.html', config))
        .then(() => browser.waitForAgentLoad())

      const { localStorage: ls1 } = await browser.getAgentSessionInfo()
      expect(ls1).toEqual(anySession())

      const newTab = await browser.createWindow('tab')
      await browser.switchToWindow(newTab.handle)
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config))
        .then(() => browser.waitForAgentLoad())

      const { localStorage: ls2 } = await browser.getAgentSessionInfo()

      await browser.closeWindow()
      await browser.switchToWindow((await browser.getWindowHandles())[0])

      expect(ls2).toEqual(anySession())
      expect(ls2.value).toEqual(ls1.value)
      expect(ls2.expiresAt).toEqual(ls1.expiresAt)
    })

    it('Session exists when config is set after loader', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [[{ request: { query } }]] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('custom-attribute-race-condition.html', config))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(query.s).not.toEqual('0')
      expect(query.s).toBeTruthy()
    })
  })

  describe('session expirations', () => {
    it('should start a new session after expiring', async () => {
      const sessionExpiresMs = 5000
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true },
          session: {
            expiresMs: sessionExpiresMs
          }
        }
      }))
        .then(() => browser.waitForAgentLoad())

      await browser.resetAgentSession()
      const agentSessionInfo = await browser.getAgentSessionInfo()

      expect(agentSessionInfo.localStorage).toEqual(Object.values(agentSessionInfo.agentSessions)[0])
      expect(agentSessionInfo.localStorage.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      expect(agentSessionInfo.localStorage.inactiveAt).toEqual(expect.any(Number))

      // wait longer than the session expiration time
      await browser.pause(sessionExpiresMs + 1000)
      const resetAgentSessionInfo = await browser.getAgentSessionInfo()

      expect(resetAgentSessionInfo.localStorage).toEqual(Object.values(resetAgentSessionInfo.agentSessions)[0])
      expect(resetAgentSessionInfo.localStorage.value).not.toEqual(agentSessionInfo.localStorage.value)
      expect(resetAgentSessionInfo.localStorage.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
    })

    it('should start a new session after inactivity', async () => {
      const sessionInactivityMs = 5000
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true },
          session: {
            inactiveMs: sessionInactivityMs
          }
        }
      }))
        .then(() => browser.waitForAgentLoad())

      await browser.resetAgentSession()
      const agentSessionInfo = await browser.getAgentSessionInfo()

      expect(agentSessionInfo.localStorage).toEqual(Object.values(agentSessionInfo.agentSessions)[0])
      expect(agentSessionInfo.localStorage.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      expect(agentSessionInfo.localStorage.inactiveAt).toEqual(expect.any(Number))

      // wait longer than the session inactivity time
      await browser.pause(sessionInactivityMs + 1000)
      const resetAgentSessionInfo = await browser.getAgentSessionInfo()

      expect(resetAgentSessionInfo.localStorage).toEqual(Object.values(resetAgentSessionInfo.agentSessions)[0])
      expect(resetAgentSessionInfo.localStorage.value).not.toEqual(agentSessionInfo.localStorage.value)
      expect(resetAgentSessionInfo.localStorage.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
    })
  })

  describe('Interactivity behavior', () => {
    const sessionInactivityMs = 5000

    it('should update inactiveTimers if page is interacted with', async () => {
      await browser.url(await browser.testHandle.assetURL('session-entity.html', {
        init: {
          privacy: { cookies_enabled: true },
          session: {
            inactiveMs: sessionInactivityMs
          }
        }
      }))
        .then(() => browser.waitForAgentLoad())

      const agentSessionInfo = await browser.getAgentSessionInfo()

      expect(agentSessionInfo.localStorage).toEqual(Object.values(agentSessionInfo.agentSessions)[0])
      expect(agentSessionInfo.localStorage.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      expect(agentSessionInfo.localStorage.inactiveAt).toEqual(expect.any(Number))

      const refreshedAt = await browser.execute(function () {
        document.querySelector('body').click()
        return Date.now()
      })
      await browser.pause(500)
      const refreshedAgentSessionInfo = await browser.getAgentSessionInfo()

      expect(refreshedAgentSessionInfo.localStorage).toEqual(Object.values(refreshedAgentSessionInfo.agentSessions)[0])
      expect(refreshedAgentSessionInfo.localStorage.value).toEqual(agentSessionInfo.localStorage.value)
      expect(refreshedAgentSessionInfo.localStorage.inactiveAt).not.toEqual(agentSessionInfo.localStorage.inactiveAt)
      expect(refreshedAgentSessionInfo.localStorage.inactiveAt - refreshedAt).toBeGreaterThan(0)
    })

    it('should update inactiveAt in local storage across page loads', async () => {
      await browser.url(await browser.testHandle.assetURL('session-entity.html', {
        init: {
          privacy: { cookies_enabled: true },
          session: {
            inactiveMs: sessionInactivityMs
          }
        }
      }))
        .then(() => browser.waitForAgentLoad())

      const agentSessionInfo = await browser.getAgentSessionInfo()

      expect(agentSessionInfo.localStorage).toEqual(Object.values(agentSessionInfo.agentSessions)[0])
      expect(agentSessionInfo.localStorage.value).toEqual(expect.stringMatching(/^[a-zA-Z0-9]{16,}$/))
      expect(agentSessionInfo.localStorage.inactiveAt).toEqual(expect.any(Number))

      const refreshedAt = await browser.execute(function () {
        document.querySelector('body').click()
        return Date.now()
      })
      await browser.url(await browser.testHandle.assetURL('fetch.html', config))
        .then(() => browser.waitForAgentLoad())
      const refreshedAgentSessionInfo = await browser.getAgentSessionInfo()

      expect(refreshedAgentSessionInfo.localStorage).toEqual(Object.values(refreshedAgentSessionInfo.agentSessions)[0])
      expect(refreshedAgentSessionInfo.localStorage.value).toEqual(agentSessionInfo.localStorage.value)
      expect(refreshedAgentSessionInfo.localStorage.inactiveAt).not.toEqual(agentSessionInfo.localStorage.inactiveAt)
      expect(refreshedAgentSessionInfo.localStorage.inactiveAt - refreshedAt).toBeGreaterThan(0)
    })
  })

  describe('Custom attributes', () => {
    it('should be able to set custom attributes', async () => {
      await browser.url(await browser.testHandle.assetURL('session-entity.html', config))
        .then(() => browser.waitForAgentLoad())

      const agentSessionInfo = await browser.getAgentSessionInfo()

      expect(agentSessionInfo.localStorage.custom).toEqual({})
      expect(Object.values(agentSessionInfo.agentSessions)[0].custom).toEqual({})

      await browser.execute(function () {
        newrelic.setCustomAttribute('test', 1, true)
      })
      const updatedAgentSessionInfo = await browser.getAgentSessionInfo()

      expect(updatedAgentSessionInfo.localStorage.custom).toEqual({ test: 1 })
      expect(Object.values(updatedAgentSessionInfo.agentSessions)[0].custom).toEqual({ test: 1 })
    })
  })

  describe('misc session entity class attributes', () => {
    it('should flag as initialized', async () => {
      await browser.url(await browser.testHandle.assetURL('session-entity.html', config))
        .then(() => browser.waitForAgentLoad())

      const initialized = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.session.initialized
      })

      expect(initialized).toEqual(true)
    })
  })

  describe('session entity events', () => {
    it('should notify when resetting', async () => {
      await browser.url(await browser.testHandle.assetURL('session-entity.html', config))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        window.wasReset = false
        newrelic.ee.on('session-reset', function () {
          window.wasReset = true
        })
      })
      await browser.resetAgentSession()

      const wasReset = await browser.execute(function () {
        return window.wasReset
      })
      expect(wasReset).toEqual(true)
    })
  })
})
