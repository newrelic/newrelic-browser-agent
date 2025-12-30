import { testErrorsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

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
      expect(rumResultAfterRefresh[1].request.body.ja).toEqual({ [ERRORS_INBOX_UID]: 'user123' }) // setUserId affects subsequent page loads in the same storage session
    })
  })
})
