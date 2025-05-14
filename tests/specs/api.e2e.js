import { checkAjaxEvents, checkJsErrors, checkMetrics, checkGenericEvents, checkPVT, checkRumBody, checkRumQuery, checkSessionTrace, checkSpa } from '../util/basic-checks'
import { testAjaxEventsRequest, testAjaxTimeSlicesRequest, testBlobTraceRequest, testCustomMetricsRequest, testErrorsRequest, testEventsRequest, testInsRequest, testInteractionEventsRequest, testLogsRequest, testMetricsRequest, testRumRequest, testTimingEventsRequest } from '../../tools/testing-server/utils/expect-tests'
import { rumFlags } from '../../tools/testing-server/constants'
import { LOGGING_MODE } from '../../src/features/logging/constants'

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
      register: false
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

  it('should load when sessionStorage is not available', async () => {
    await browser.url(await browser.testHandle.assetURL('api/local-storage-disallowed.html')) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    const result = await browser.execute(function () {
      return typeof window.newrelic.addToTrace === 'function'
    })

    expect(result).toEqual(true)
  })

  it('should fire `newrelic` event after RUM call', async () => {
    const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ log: LOGGING_MODE.INFO }))
    })

    const [rumHarvests] =
      await Promise.all([
        rumCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('event-listener-newrelic.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.waitUntil(
            () => browser.execute(function () {
              return window?.newrelicEventTime
            }),
            {
              timeout: 10000,
              timeoutMsg: 'Timeout while waiting on `newrelic` event'
            }
          ))
      ])

    expect(rumHarvests.length).toEqual(1)
    const rumResult = JSON.parse(rumHarvests[0].reply.body)

    const newrelicEventTime = await browser.execute(function () {
      return window.newrelicEventTime
    })

    expect(newrelicEventTime > rumResult.app.nrServerTime).toBe(true)
  })

  it('should work as expected within `newrelic` event listeners', async () => {
    const [logsCapture, errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testLogsRequest },
      { test: testErrorsRequest }
    ])
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ log: LOGGING_MODE.INFO }))
    })

    const [logsHarvests, errorsHarvests] =
    await Promise.all([
      logsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      errorsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('event-listener-newrelic.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errorsHarvests.length).toEqual(1)
    expect(errorsHarvests[0].request.query.ct).toEqual('http://custom.transaction/some-page')
    const actualErrors = errorsHarvests[0].request.body.err
    expect(actualErrors.length).toEqual(1)
    expect(actualErrors[0].params.message).toEqual('error 1')

    expect(logsHarvests.length).toEqual(1)
    const logsPayload = JSON.parse(logsHarvests[0].request.body)
    expect(logsPayload[0].common.attributes['application.version']).toEqual('1.0.0')
    expect(logsPayload[0].common.attributes.foo).toEqual('bar')
    expect(logsPayload[0].logs[0].message).toEqual('test message')
  })

  describe('setPageViewName()', () => {
    it('includes the 1st argument (page name) in rum, resources, events, and ajax calls', async () => {
      const [rumCapture, eventsCapture, ajaxCapture] =
        await browser.testHandle.createNetworkCaptures('bamServer', [
          { test: testRumRequest },
          { test: testEventsRequest },
          { test: testAjaxTimeSlicesRequest }
        ])

      const [rumResults, eventsResults, ajaxResults] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        eventsCapture.waitForResult({ totalCount: 1 }),
        ajaxCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api.html')) // Setup expects before loading the page
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResults[0].request.query.ct).toEqual('http://custom.transaction/foo')
      expect(eventsResults[0].request.query.ct).toEqual('http://custom.transaction/foo')
      expect(ajaxResults[0].request.query.ct).toEqual('http://custom.transaction/foo')
    })

    it('includes the 1st argument (page name) in metrics call on unload', async () => {
      await browser.url(await browser.testHandle.assetURL('api.html'))
        .then(() => browser.waitForAgentLoad())

      const customMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
        test: testCustomMetricsRequest
      })
      const [unloadCustomMetricsResults] = await Promise.all([
        customMetricsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
      ])

      expect(unloadCustomMetricsResults[0].request.query.ct).toEqual('http://custom.transaction/foo')
      expect(Array.isArray(unloadCustomMetricsResults[0].request.body.cm)).toEqual(true)
      expect(unloadCustomMetricsResults[0].request.body.cm.length).toBeGreaterThan(0)

      const time = unloadCustomMetricsResults[0].request.body.cm[0].metrics?.time?.t
      expect(typeof time).toEqual('number')
      expect(time).toBeGreaterThan(0)
    })

    it('includes the optional 2nd argument for host in metrics call on unload', async () => {
      const customMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
        test: testCustomMetricsRequest
      })
      await browser.url(await browser.testHandle.assetURL('api2.html'))
        .then(() => browser.waitForAgentLoad())

      const [unloadCustomMetricsResults] = await Promise.all([
        customMetricsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
      ])

      expect(unloadCustomMetricsResults[0].request.query.ct).toEqual('http://bar.baz/foo')
      expect(Array.isArray(unloadCustomMetricsResults[0].request.body.cm)).toEqual(true)
      expect(unloadCustomMetricsResults[0].request.body.cm.length).toBeGreaterThan(0)

      const time = unloadCustomMetricsResults[0].request.body.cm[0].metrics?.time?.t
      expect(typeof time).toEqual('number')
      expect(time).toBeGreaterThan(0)
    })
  })

  describe('noticeError()', () => {
    it('takes an error object', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResults] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api.html')) // Setup expects before loading the page
          .then(() => browser.waitForAgentLoad())
      ])

      expect(Array.isArray(errorsResults[0].request.body.err)).toEqual(true)
      expect(errorsResults[0].request.body.err.length).toBeGreaterThan(0)

      const params = errorsResults[0].request.body.err[0].params

      expect(params).toBeDefined()
      expect(params.exceptionClass).toEqual('Error')
      expect(params.message).toEqual('no free taco coupons')
    })

    it('takes a string', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResults] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/noticeError.html')) // Setup expects before loading the page
          .then(() => browser.waitForAgentLoad())
      ])

      expect(Array.isArray(errorsResults[0].request.body.err)).toEqual(true)
      expect(errorsResults[0].request.body.err.length).toBeGreaterThan(0)

      const params = errorsResults[0].request.body.err[0].params

      expect(params).toBeDefined()
      expect(params.exceptionClass).toEqual('Error')
      expect(params.message).toEqual('too many free taco coupons')
    })
  })

  describe('finished()', () => {
    it('records a PageAction when called before RUM message', async () => {
      const insCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })

      const [insResult] = await Promise.all([
        insCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/finished.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      const pageActions = insResult[0].request.body.ins.filter(evt => evt.eventType === 'PageAction')
      expect(pageActions).toBeDefined()
      expect(pageActions.length).toEqual(1) // exactly 1 PageAction was submitted
      expect(pageActions[0].actionName).toEqual('finished') // PageAction has actionName = finished
    })
  })

  describe('release()', () => {
    it('adds releases to jserrors', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/release.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(errorsResult[0].request.query.ri).toEqual('{"example":"123","other":"456"}')
    })

    it('limits releases to jserrors', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/release-too-many.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(JSON.parse(errorsResult[0].request.query.ri)).toEqual({
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

    it('limits size in jserrors payload', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/release-too-long.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      const queryRi = JSON.parse(errorsResult[0].request.query.ri)
      expect(queryRi.one).toEqual('201')
      expect(queryRi.three).toMatch(/y{99}x{100}q/)
      expect(Object.keys(queryRi).find(element => element.match(/y{99}x{100}q/))).toBeTruthy()
    })

    it('does not set ri query param if release() is not called', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/no-release.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(errorsResult[0].request.query).not.toHaveProperty('ri')
    })
  })

  describe('setCustomAttribute()', () => {
    it('persists attribute onto subsequent page loads until unset', async () => {
      const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
      const testUrl = await browser.testHandle.assetURL('api/custom-attribute.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })

      const [rumResult] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        browser.url(testUrl)
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResult[0].request.body.ja).toEqual({ testing: 123 }) // initial page load has custom attribute

      const subsequentTestUrl = await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })

      const [rumResultAfterNavigate] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 2 }),
        browser.url(subsequentTestUrl)
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResultAfterNavigate[1].request.body.ja).toEqual({ testing: 123 }) // 2nd page load still has custom attribute from storage

      await browser.execute(function () {
        newrelic.setCustomAttribute('testing', null)
      })

      const [rumResultAfterUnset] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 3 }),
        browser.url(subsequentTestUrl)
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResultAfterUnset[2].request.body).not.toHaveProperty('ja') // 3rd page load does not retain custom attribute after unsetting (set to null)
    })
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

  describe('start', () => {
    const config = {
      init: {
        privacy: { cookies_enabled: true }
      }
    }

    it('should start all features', async () => {
      const [rumCapture, timingsCapture, ajaxEventsCapture, errorsCapture, metricsCapture, insCapture, traceCapture, interactionCapture] =
        await browser.testHandle.createNetworkCaptures('bamServer', [
          { test: testRumRequest },
          { test: testTimingEventsRequest },
          { test: testAjaxEventsRequest },
          { test: testErrorsRequest },
          { test: testMetricsRequest },
          { test: testInsRequest },
          { test: testBlobTraceRequest },
          { test: testInteractionEventsRequest }
        ])

      const initialLoad = await Promise.all([
        rumCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('instrumented-manual.html'), config)
          .then(() => undefined)
      ])

      expect(initialLoad).toEqual([[], undefined])

      const results = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        timingsCapture.waitForResult({ totalCount: 1 }),
        ajaxEventsCapture.waitForResult({ totalCount: 1 }),
        errorsCapture.waitForResult({ totalCount: 1 }),
        metricsCapture.waitForResult({ totalCount: 1 }),
        insCapture.waitForResult({ totalCount: 1 }),
        traceCapture.waitForResult({ totalCount: 1 }),
        interactionCapture.waitForResult({ totalCount: 1 }),
        browser.execute(function () {
          newrelic.start()
          setTimeout(function () {
            window.location.reload()
          }, 1000)
        })
      ])

      checkRumQuery(results[0][0].request)
      checkRumBody(results[0][0].request)
      checkPVT(results[1][0].request)
      checkAjaxEvents(results[2][0].request)
      checkJsErrors(results[3][0].request, { messages: ['test'] })
      checkMetrics(results[4][0].request)
      checkGenericEvents(results[5][0].request, { specificAction: 'test', actionContents: { test: 1 } })
      checkSessionTrace(results[6][0].request)
      checkSpa(results[7][0].request)
    })

    it('starts everything if the auto features do not include PVE, and nothing should have started', async () => {
      const [rumCapture, errorsCapture] = await Promise.all([
        browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest }),
        browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
      ])

      const initialLoad = await Promise.all([
        rumCapture.waitForResult({ timeout: 10000 }),
        errorsCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('instrumented-manual.html', {
          init: {
            ...config.init,
            jserrors: {
              autoStart: true
            }
          }
        })).then(() => undefined)
      ])

      expect(initialLoad).toEqual([[], [], undefined])

      const results = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.execute(function () {
          newrelic.start()
        })
      ])

      checkRumQuery(results[0][0].request)
      checkRumBody(results[0][0].request)
      checkJsErrors(results[1][0].request, { messages: ['test'] })
    })

    it('starts the rest of the features if the auto features include PVE, and those should have started', async () => {
      const [rumCapture, timingsCapture, ajaxEventsCapture, errorsCapture, traceCapture, interactionCapture] =
        await browser.testHandle.createNetworkCaptures('bamServer', [
          { test: testRumRequest },
          { test: testTimingEventsRequest },
          { test: testAjaxEventsRequest },
          { test: testErrorsRequest },
          { test: testBlobTraceRequest },
          { test: testInteractionEventsRequest }
        ])

      const results = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        timingsCapture.waitForResult({ totalCount: 1 }),
        ajaxEventsCapture.waitForResult({ timeout: 10000 }),
        errorsCapture.waitForResult({ timeout: 10000 }),
        traceCapture.waitForResult({ totalCount: 1 }),
        interactionCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('instrumented.html', {
          init: {
            ...config.init,
            ajax: {
              autoStart: false
            },
            jserrors: {
              autoStart: false
            }
          }
        })).then(() => browser.execute(function () {
          setTimeout(function () {
            var xhr = new XMLHttpRequest()
            xhr.open('GET', '/json')
            xhr.send()
            newrelic.noticeError('test')
          }, 1000)
        }))
      ])

      checkRumQuery(results[0][0].request)
      checkRumBody(results[0][0].request)
      checkPVT(results[1][0].request)
      checkSessionTrace(results[4][0].request)
      checkSpa(results[5][0].request)

      await browser.pause(5000)
      const subsequentResults = await Promise.all([
        ajaxEventsCapture.waitForResult({ totalCount: 1 }),
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.execute(function () {
          newrelic.start()
        })
      ])

      checkAjaxEvents(subsequentResults[0][0].request)
      checkJsErrors(subsequentResults[1][0].request)
    })
  })
})
