import { consistentTimingData, reliableUnload, notIE } from '../../tools/browser-matcher/common-matchers.mjs'

describe('newrelic api', () => {
  it('should load when sessionStorage is not available', async () => {
    await browser.url(await browser.testHandle.assetURL('api/local-storage-disallowed.html')) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    const result = await browser.execute(function () {
      return typeof window.newrelic.addToTrace === 'function'
    })

    expect(result).toEqual(true)
  })

  describe('setPageViewName()', () => {
    it('includes the 1st argument (page name) in rum, resources, events, and ajax calls', async () => {
      const [rumResults, resourcesResults, eventsResults, ajaxResults] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectResources(),
        browser.testHandle.expectEvents(),
        browser.testHandle.expectAjaxTimeSlices(),
        browser.url(await browser.testHandle.assetURL('api.html')) // Setup expects before loading the page
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResults.request.query.ct).toEqual('http://custom.transaction/foo')
      expect(resourcesResults.request.query.ct).toEqual('http://custom.transaction/foo')
      expect(eventsResults.request.query.ct).toEqual('http://custom.transaction/foo')
      expect(ajaxResults.request.query.ct).toEqual('http://custom.transaction/foo')
    })

    it('includes the 1st argument (page name) in metrics call on unload', async () => {
      await browser.url(await browser.testHandle.assetURL('api.html'))
        .then(() => browser.waitForAgentLoad())

      const [unloadCustomMetricsResults] = await Promise.all([
        browser.testHandle.expectCustomMetrics(),
        await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
      ])

      expect(unloadCustomMetricsResults.request.query.ct).toEqual('http://custom.transaction/foo')
      expect(Array.isArray(unloadCustomMetricsResults.request.body.cm)).toEqual(true)
      expect(unloadCustomMetricsResults.request.body.cm.length).toBeGreaterThan(0)

      const time = unloadCustomMetricsResults.request.body.cm[0].metrics?.time?.t
      expect(typeof time).toEqual('number')
      expect(time).toBeGreaterThan(0)
    })

    // Does not run for Firefox <= 19
    withBrowsersMatching(consistentTimingData)('includes the optional 2nd argument for host in metrics call on unload', async () => {
      await browser.url(await browser.testHandle.assetURL('api2.html'))
        .then(() => browser.waitForAgentLoad())

      const [unloadCustomMetricsResults] = await Promise.all([
        browser.testHandle.expectCustomMetrics(),
        await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
      ])

      expect(unloadCustomMetricsResults.request.query.ct).toEqual('http://bar.baz/foo')
      expect(Array.isArray(unloadCustomMetricsResults.request.body.cm)).toEqual(true)
      expect(unloadCustomMetricsResults.request.body.cm.length).toBeGreaterThan(0)

      const time = unloadCustomMetricsResults.request.body.cm[0].metrics?.time?.t
      expect(typeof time).toEqual('number')
      expect(time).toBeGreaterThan(0)
    })
  })

  describe('noticeError()', () => {
    it('takes an error object', async () => {
      const [errorsResults] = await Promise.all([
        browser.testHandle.expectErrors(),
        browser.url(await browser.testHandle.assetURL('api.html')) // Setup expects before loading the page
          .then(() => browser.waitForAgentLoad())
      ])

      expect(Array.isArray(errorsResults.request.body.err)).toEqual(true)
      expect(errorsResults.request.body.err.length).toBeGreaterThan(0)

      const params = errorsResults.request.body.err[0].params

      expect(params).toBeDefined()
      expect(params.exceptionClass).toEqual('Error')
      expect(params.message).toEqual('no free taco coupons')
    })

    it('takes a string', async () => {
      const [errorsResults] = await Promise.all([
        browser.testHandle.expectErrors(),
        browser.url(await browser.testHandle.assetURL('api/noticeError.html')) // Setup expects before loading the page
          .then(() => browser.waitForAgentLoad())
      ])

      expect(Array.isArray(errorsResults.request.body.err)).toEqual(true)
      expect(errorsResults.request.body.err.length).toBeGreaterThan(0)

      const params = errorsResults.request.body.err[0].params

      expect(params).toBeDefined()
      expect(params.exceptionClass).toEqual('Error')
      expect(params.message).toEqual('too many free taco coupons')
    })
  })

  describe('finished()', () => {
    it('records a PageAction when called before RUM message', async () => {
      const [insResult] = await Promise.all([
        browser.testHandle.expectIns(),
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL('api/finished.html', {
          init: {
            page_view_timing: {
              enabled: false
            },
            ins: {
              harvestTimeSeconds: 2
            }
          }
        }))
          .then(() => browser.waitForAgentLoad())
      ])

      const pageActions = insResult.request.body.ins
      expect(pageActions).toBeDefined()
      expect(pageActions.length).toEqual(1) // exactly 1 PageAction was submitted
      expect(pageActions[0].actionName).toEqual('finished') // PageAction has actionName = finished
    })
  })

  describe('release()', () => {
    const releaseApiConfig = {
      init: {
        page_view_timing: {
          enabled: false
        },
        metrics: {
          enabled: false
        }
      }
    }

    withBrowsersMatching(reliableUnload)('adds releases to jserrors', async () => {
      await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL('api/release.html', releaseApiConfig))
          .then(() => browser.waitForAgentLoad())
      ])

      const [errorsResult] = await Promise.all([
        browser.testHandle.expectErrors(),
        browser.url(await browser.testHandle.assetURL('/'))
      ])

      expect(errorsResult.request.query.ri).toEqual('{"example":"123","other":"456"}')
    })

    withBrowsersMatching(reliableUnload)('limits releases to jserrors', async () => {
      await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL('api/release-too-many.html', releaseApiConfig))
          .then(() => browser.waitForAgentLoad())
      ])

      const [errorsResult] = await Promise.all([
        browser.testHandle.expectErrors(),
        browser.url(await browser.testHandle.assetURL('/'))
      ])

      expect(JSON.parse(errorsResult.request.query.ri)).toEqual({
        one: '1',
        two: '2',
        three: '3',
        four: '4',
        five: '5',
        six: '6',
        seven: '7',
        eight: '8',
        nine: '9',
        ten: '10'
      })
    })

    withBrowsersMatching(reliableUnload)('limits size in jserrors payload', async () => {
      await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL('api/release-too-long.html', releaseApiConfig))
          .then(() => browser.waitForAgentLoad())
      ])

      const [errorsResult] = await Promise.all([
        browser.testHandle.expectErrors(),
        browser.url(await browser.testHandle.assetURL('/'))
      ])

      const queryRi = JSON.parse(errorsResult.request.query.ri)
      expect(queryRi.one).toEqual('201')
      expect(queryRi.three).toMatch(/y{99}x{100}q/)
      expect(Object.keys(queryRi)).toContain(expect.stringMatching(/y{99}x{100}q/))
    })

    withBrowsersMatching(reliableUnload)('does not set ri query param if release() is not called', async () => {
      await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL('api/no-release.html', releaseApiConfig))
          .then(() => browser.waitForAgentLoad())
      ])

      const [errorsResult] = await Promise.all([
        browser.testHandle.expectErrors(),
        browser.url(await browser.testHandle.assetURL('/'))
      ])

      expect(errorsResult.request.query).not.toHaveProperty('ri')
    })
  })

  describe('setCustomAttribute()', () => {
    withBrowsersMatching(notIE)('persists attribute onto subsequent page loads until unset', async () => {
      const [rumResult] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL('instrumented.html', { scriptString: 'newrelic.setCustomAttribute(\'testing\', 123, true);' }))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResult.request.body.ja).toEqual({ testing: 123 }) // initial page load has custom attribute

      const [rumResultAfterRefresh] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.refresh()
      ])

      expect(rumResultAfterRefresh.request.body.ja).toEqual({ testing: 123 }) // 2nd page load still has custom attribute from storage

      await browser.execute(function () {
        newrelic.setCustomAttribute('testing', null)
      })

      const [rumResultAfterUnset] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResultAfterUnset.request.body).not.toHaveProperty('ja') // 3rd page load does not retain custom attribute after unsetting (set to null)
    })
  })

  describe('setUserId()', () => {
    const ERRORS_INBOX_UID = 'enduser.id' // this key should not be changed without consulting EI team on the data flow

    withBrowsersMatching(reliableUnload, notIE)('adds correct (persisted) attribute to payloads', async () => {
      await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL('instrumented.html', {
          init: {
            jserrors: { harvestTimeSeconds: 2 },
            privacy: { cookies_enabled: true }
          },
          scriptString: `
            newrelic.setUserId(456)
            newrelic.setUserId({'foo':'bar'})
            newrelic.noticeError('fake1')
            `
        }))
          .then(() => browser.waitForAgentLoad())
      ])

      const firstErrorsResult = await browser.testHandle.expectErrors(3000)

      expect(firstErrorsResult.request.body.err[0]).toHaveProperty('custom')
      expect(firstErrorsResult.request.body.err[0].custom[ERRORS_INBOX_UID]).not.toBeDefined() // Invalid data type (non-string) does not set user id

      await browser.execute(function () {
        newrelic.setUserId('user123')
        newrelic.setUserId()
        newrelic.noticeError('fake2')
      })

      const secondErrorsResult = await browser.testHandle.expectErrors(3000)

      expect(secondErrorsResult.request.body.err[0]).toHaveProperty('custom')
      expect(secondErrorsResult.request.body.err[0].custom[ERRORS_INBOX_UID]).toBeDefined()
      expect(secondErrorsResult.request.body.err[0].custom[ERRORS_INBOX_UID]).toBe('user123') // Correct enduser.id custom attr on error

      const [rumResultAfterRefresh] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.refresh()
      ])

      // We expect setUserId's attribute to be stored by the browser tab session, and retrieved on the next page load & agent init
      expect(rumResultAfterRefresh.request.body.ja).toEqual({ [ERRORS_INBOX_UID]: 'user123' }) // setUserId affects subsequent page loads in the same storage session

      await browser.execute(function () {
        newrelic.setUserId(null) // unset to not affect other tests running on same Sauce instance
      })
    })
  })
})
