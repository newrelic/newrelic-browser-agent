import { testErrorsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { lambdaTestWebdriverFalse } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('newrelic api', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  describe('setUserId()', () => {
    const ERRORS_INBOX_UID = 'enduser.id' // this key should not be changed without consulting EI team on the data flow

    it('adds correct (persisted) attribute to payloads', async () => {
      const [rumCapture, errorsCapture] =
        await browser.testHandle.createNetworkCaptures('bamServer', [
          { test: testRumRequest },
          { test: testErrorsRequest }
        ])
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      }))
        .then(() => browser.waitForAgentLoad())

      const [firstErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.execute(function () {
          newrelic.setUserId(456)
          newrelic.setUserId({ foo: 'bar' })
          newrelic.noticeError('fake1')
        })
      ])

      expect(firstErrorsResult[0].request.body.err[0]).toHaveProperty('custom')
      expect(firstErrorsResult[0].request.body.err[0].custom[ERRORS_INBOX_UID]).not.toBeDefined() // Invalid data type (non-string) does not set user id

      const [secondErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 2 }),
        browser.execute(function () {
          newrelic.setUserId('user123')
          newrelic.setUserId()
          newrelic.noticeError('fake2')
        })
      ])

      expect(secondErrorsResult[1].request.body.err[0]).toHaveProperty('custom')
      expect(secondErrorsResult[1].request.body.err[0].custom[ERRORS_INBOX_UID]).toBeDefined()
      expect(secondErrorsResult[1].request.body.err[0].custom[ERRORS_INBOX_UID]).toBe('user123') // Correct enduser.id custom attr on error

      const [rumResultAfterRefresh] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 2 }),
        browser.refresh()
      ])

      // We expect setUserId's attribute to be stored by the browser tab session, and retrieved on the next page load & agent init
      const expectedWebdriverDetected = !browserMatch(lambdaTestWebdriverFalse)
      expect(rumResultAfterRefresh[1].request.body.ja).toEqual({ [ERRORS_INBOX_UID]: 'user123', webdriverDetected: expectedWebdriverDetected }) // setUserId affects subsequent page loads in the same storage session
    })

    it('should NOT reset session if user id is changed + resetSession param = false/undefined', async () => {
      const [rumCapture, errorsCapture] =
        await browser.testHandle.createNetworkCaptures('bamServer', [
          { test: testRumRequest },
          { test: testErrorsRequest }
        ])
      await browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())

      const [firstErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.execute(function () {
          newrelic.setUserId('user111')
          newrelic.noticeError('fake1')
        })
      ])
      expect(firstErrorsResult[0].request.body.err[0]).toHaveProperty('custom')
      expect(firstErrorsResult[0].request.body.err[0].custom[ERRORS_INBOX_UID]).toBe('user111')

      const firstSession = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.session.state.value
      })

      const [secondErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 2 }),
        browser.execute(function () {
          newrelic.setUserId('user222', false)
          newrelic.noticeError('fake2')
        })
      ])
      expect(secondErrorsResult[1].request.body.err[0]).toHaveProperty('custom')
      expect(secondErrorsResult[1].request.body.err[0].custom[ERRORS_INBOX_UID]).toBe('user222')

      const secondSession = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.session.state.value
      })
      expect(secondSession).toEqual(firstSession)

      const [rumResultAfterRefresh] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 2 }),
        browser.refresh()
      ])

      const expectedWebdriverDetected = !browserMatch(lambdaTestWebdriverFalse)
      expect(rumResultAfterRefresh[1].request.body.ja).toEqual({ [ERRORS_INBOX_UID]: 'user222', webdriverDetected: expectedWebdriverDetected }) // setUserId affects subsequent page loads in the same storage session
    })

    it('should NOT reset session if user id is changed from falsy -> defined value + resetSession param = true', async () => {
      const [errorsCapture] =
        await browser.testHandle.createNetworkCaptures('bamServer', [
          { test: testErrorsRequest }
        ])
      await browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())

      const initialSession = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.session.state.value
      })

      const [firstErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.execute(function () {
          newrelic.setUserId('user111', true)
          newrelic.noticeError('fake1')
        })
      ])
      expect(firstErrorsResult[0].request.body.err[0]).toHaveProperty('custom')
      expect(firstErrorsResult[0].request.body.err[0].custom[ERRORS_INBOX_UID]).toBe('user111')

      const firstSessionAfterSetUserId = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.session.state.value
      })
      expect(firstSessionAfterSetUserId).toEqual(initialSession)
    })

    it('should NOT reset session if userid is the same + resetSession param = true', async () => {
      const [errorsCapture] =
        await browser.testHandle.createNetworkCaptures('bamServer', [
          { test: testErrorsRequest }
        ])
      await browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())

      const [firstErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.execute(function () {
          newrelic.setUserId('user111')
          newrelic.noticeError('fake1')
        })
      ])
      expect(firstErrorsResult[0].request.body.err[0]).toHaveProperty('custom')
      expect(firstErrorsResult[0].request.body.err[0].custom[ERRORS_INBOX_UID]).toBe('user111')

      const firstSession = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.session.state.value
      })

      const [secondErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 2 }),
        browser.execute(function () {
          newrelic.setUserId('user111', true)
          newrelic.noticeError('fake2')
        })
      ])
      expect(secondErrorsResult[1].request.body.err[0]).toHaveProperty('custom')
      expect(secondErrorsResult[1].request.body.err[0].custom[ERRORS_INBOX_UID]).toBe('user111')

      const sessionAfterSetUserId = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.session.state.value
      })
      expect(sessionAfterSetUserId).toEqual(firstSession)
    })

    it('should reset session if user id is changed + resetSession param = true, but should NOT persist userid across session expiration', async () => {
      const [errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testErrorsRequest }
      ])
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: {
          session: { expiresMs: 10000 }
        }
      })).then(() => browser.waitForAgentLoad())

      // #1 - arrange userid = 'user111' to create baseline
      const [firstErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.execute(function () {
          newrelic.setUserId('user111')
          newrelic.noticeError('fake1')
        })
      ])
      expect(firstErrorsResult[0].request.body.err[0]).toHaveProperty('custom')
      expect(firstErrorsResult[0].request.body.err[0].custom[ERRORS_INBOX_UID]).toBe('user111')

      const firstSession = await browser.execute(function () {
        return {
          value: Object.values(newrelic.initializedAgents)[0].runtime.session.state.value
        }
      })

      // #2 - update userid = 'user222' and reset session
      // expected: new session created with new userid, new user id is stored in LS and used in payloads
      await browser.execute(() => newrelic.setCustomAttribute('foo', 'bar', true))
      await browser.execute(() => newrelic.setUserId('user222', true))
      const [secondErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 2 }),
        browser.execute(function () {
          newrelic.noticeError('fake2')
        })
      ])
      expect(secondErrorsResult[1].request.body.err[0]).toHaveProperty('custom')
      expect(secondErrorsResult[1].request.body.err[0].custom[ERRORS_INBOX_UID]).toBe('user222')
      expect(secondErrorsResult[1].request.body.err[0].params.message).toEqual('fake2')

      let agentSession = await browser.getAgentSessionInfo()
      const sessionAfterSetUserId = Object.values(agentSession.agentSessions)[0]
      expect(sessionAfterSetUserId.value).not.toEqual(firstSession.value)
      expect(sessionAfterSetUserId.custom).toEqual({
        [ERRORS_INBOX_UID]: 'user222'
      })
      await browser.pause(1000) // wait for any async storage operations to complete
      agentSession = await browser.getAgentSessionInfo()
      expect(agentSession.localStorage.custom).toEqual({
        [ERRORS_INBOX_UID]: 'user222'
      })

      // #3 - simulate session expiration while on page
      // expected: new session created with no userid, custom attributes cleared from local storage but remains in payloads due to agent.info retention
      await browser.pause(10000)
      const [thirdErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 3 }),
        browser.execute(function () {
          newrelic.noticeError('fake3')
        })
      ])
      const agentAfterExpiration = await browser.execute(function () {
        return {
          jsAttributes: Object.values(newrelic.initializedAgents)[0].info.jsAttributes
        }
      })

      await browser.pause(1000) // wait for any async storage operations to complete
      agentSession = await browser.getAgentSessionInfo()
      expect(agentSession.localStorage.custom).toEqual({})

      const sessionAfterExpiration = Object.values(agentSession.agentSessions)[0]
      expect(sessionAfterExpiration.value).not.toEqual(sessionAfterSetUserId.value)
      expect(sessionAfterExpiration.custom).toEqual({}) // session custom attributes should be cleared on expiration
      expect(agentAfterExpiration.jsAttributes).toEqual({
        foo: 'bar',
        [ERRORS_INBOX_UID]: 'user222'
      })

      // since the session expired while still on the page, current behavior holds onto custom attributes in memory via agent.info
      expect(thirdErrorsResult[2].request.body.err[0]).toHaveProperty('custom')
      expect(thirdErrorsResult[2].request.body.err[0].custom[ERRORS_INBOX_UID]).toBe('user222')
      expect(thirdErrorsResult[2].request.body.err[0].custom.foo).toEqual('bar')
      expect(thirdErrorsResult[2].request.body.err[0].params.message).toEqual('fake3')

      // #4 - revisit page for a final check
      // expected: same session, custom attributes (including userid) are cleared in LS and payloads
      await browser.refresh()
      await browser.waitForAgentLoad()

      const [fourthErrorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 4 }),
        browser.execute(function () {
          newrelic.noticeError('fake4')
        })
      ])

      // on a fresh visit, userid along with other custom attributes should be cleared from agent.info + subsequent payloads
      const agentAfterReload = await browser.execute(function () {
        return {
          jsAttributes: Object.values(newrelic.initializedAgents)[0].info.jsAttributes
        }
      })
      agentSession = await browser.getAgentSessionInfo()
      expect(agentSession.localStorage.custom).toEqual({})

      const sessionAfterReload = Object.values(agentSession.agentSessions)[0]
      expect(sessionAfterReload.value).toEqual(sessionAfterExpiration.value) // same session
      expect(sessionAfterReload.custom).toEqual({})
      expect(agentAfterReload.jsAttributes).toEqual({})

      expect(fourthErrorsResult[3].request.body.err[0]).toHaveProperty('custom')
      expect(fourthErrorsResult[3].request.body.err[0].custom).toEqual({})
      expect(fourthErrorsResult[3].request.body.err[0].params.message).toEqual('fake4')
    })
  })
})
