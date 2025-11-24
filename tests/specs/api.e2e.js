import { checkAjaxEvents, checkJsErrors, checkMetrics, checkGenericEvents, checkPVT, checkRumBody, checkRumQuery, checkSessionTrace, checkSpa } from '../util/basic-checks'
import { testAjaxEventsRequest, testAjaxTimeSlicesRequest, testBlobTraceRequest, testCustomMetricsRequest, testErrorsRequest, testEventsRequest, testInsRequest, testInteractionEventsRequest, testLogsRequest, testMetricsRequest, testMFEErrorsRequest, testMFEInsRequest, testRumRequest, testTimingEventsRequest } from '../../tools/testing-server/utils/expect-tests'
import { rumFlags } from '../../tools/testing-server/constants'
import { LOGGING_MODE } from '../../src/features/logging/constants'

describe('newrelic api', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  describe('registered-entity', () => {
    it('should still harvest scoped data after deregistering', async () => {
      const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testMFEErrorsRequest }
      ])
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

      await browser.execute(function () {
        window.agent1 = newrelic.register({
          id: 1,
          name: 'agent1'
        })
        window.agent1.noticeError('1')
        window.agent1.deregister()
      })

      const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

      // should still get a harvest even tho the MFE was deregistered
      expect(errorsHarvests.length).toEqual(1)

      // should not get future data now that the MFE was deregistered
      await browser.execute(function () {
        window.agent1.noticeError('2')
      })

      const errorsHarvests2 = await mfeErrorsCapture.waitForResult({ timeout: 10000 })

      // should not have gotten more data
      expect(errorsHarvests2.length).toEqual(errorsHarvests.length)
    })

    it('should allow a nested register', async () => {
      const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testMFEErrorsRequest }
      ])
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

      await browser.execute(function () {
        window.agent1 = newrelic.register({
          id: 1,
          name: 'agent1'
        })
        window.agent2 = window.agent1.register({
          id: 2,
          name: 'agent2'
        })
        window.agent3 = window.agent2.register({
          id: 3,
          name: 'agent3'
        })
        // should get data as "agent2"
        window.agent1.noticeError('1')
        window.agent2.noticeError('2')
        window.agent3.noticeError('3')
      })

      const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

      const containerAgentEntityGuid = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.appMetadata.agents[0].entityGuid
      })

      // should get ALL data as "agent2" since it replaced the name of agent 1 of the same id
      errorsHarvests.forEach(({ request: { query, body } }) => {
        const data = body.err
        data.forEach((err, idx) => {
          expect(err.custom['mfe.name']).toEqual('agent' + (idx + 1))
          if (idx === 0) expect(err.custom['parent.id']).toEqual(containerAgentEntityGuid) // first app should have container as its parent
          if (idx === 1) expect(err.custom['parent.id']).toEqual(1) // second app should have first app as its parent
          if (idx === 2) expect(err.custom['parent.id']).toEqual(2) // third app should have second app as its parent
        })
      })
    })

    const featureFlags = [
      [],
      ['register'],
      ['register', 'register.jserrors'],
      ['register', 'register.generic_events'],
      ['register', 'register.jserrors', 'register.generic_events'],
      ['register.jserrors', 'register.generic_events'],
      ['register.jserrors'],
      ['register.generic_events']
    ]
    featureFlags.forEach((testSet) => {
      it(`RegisteredEntity -- ${testSet.join(' | ') || 'no flags'}`, async () => {
        const [rumCapture, mfeErrorsCapture, mfeInsightsCapture, regularErrorsCapture, regularInsightsCapture, logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
          { test: testRumRequest },
          { test: testMFEErrorsRequest },
          { test: testMFEInsRequest },
          { test: testErrorsRequest },
          { test: testInsRequest },
          { test: testLogsRequest }
        ])
        await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: testSet } }))

        await browser.execute(function () {
          window.agent1 = newrelic.register({
            id: 1,
            name: 'agent1'
          })
          window.agent2 = newrelic.register({
            id: 2,
            name: 'agent2'
          })

          // each payload in this test is decorated with data that matches its appId for ease of testing
          window.newrelic.setCustomAttribute('customAttr', '42') // container agent
          window.agent1.setCustomAttribute('customAttr', '1') // micro agent (agent1)
          window.agent2.setCustomAttribute('customAttr', '2') // micro agent (agent2)

          // each payload in this test is decorated with data that matches its appId for ease of testing
          window.newrelic.noticeError('42')
          window.agent1.noticeError('1')
          window.agent2.noticeError('2')

          // each payload in this test is decorated with data that matches its appId for ease of testing
          window.newrelic.addPageAction('42', { val: 42 })
          window.agent1.addPageAction('1', { val: 1 })
          window.agent2.addPageAction('2', { val: 2 })

          // each payload in this test is decorated with data that matches its appId for ease of testing
          window.newrelic.log('42')
          window.agent1.log('1', { level: 'error' })
          window.agent2.log('2', { level: 'error' })

          // each payload in this test is decorated with data that matches its appId for ease of testing
          window.newrelic.recordCustomEvent('CustomEvent', { val: 42 })
          window.agent1.recordCustomEvent('CustomEvent', { val: 1 })
          window.agent2.recordCustomEvent('CustomEvent', { val: 2 })

          // each payload in this test is decorated with data that matches its appId for ease of testing
          window.newrelic.measure('42')
          window.agent1.measure('1')
          window.agent2.measure('2')
        })
        const [rumHarvests, errorsHarvests, insightsHarvests, logsHarvest] = await Promise.all([
          rumCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
          ((testSet.includes('register') && testSet.includes('register.jserrors')) ? mfeErrorsCapture : regularErrorsCapture).waitForResult({ totalCount: 1, timeout: 10000 }),
          ((testSet.includes('register') && testSet.includes('register.generic_events')) ? mfeInsightsCapture : regularInsightsCapture).waitForResult({ totalCount: 1, timeout: 10000 }),
          logsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
        ])

        const containerAgentEntityGuid = await browser.execute(function () {
          return Object.values(newrelic.initializedAgents)[0].runtime.appMetadata.agents[0].entityGuid
        })

        // these props will get set to true once a test has matched it
        // if it gets tried again, the test will fail, since these should all
        // only have one distinct matching payload
        const tests = {
          42: { rum: false, err: false, pa: false, log: false, rce: false, measure: false }, // container agent defaults to appId 42
          1: { err: false, pa: false, log: false, rce: false, measure: false }, // agent1 instance
          2: { err: false, pa: false, log: false, rce: false, measure: false } // agent2 instance
        }

        expect(rumHarvests).toHaveLength(1)
        expect(errorsHarvests.length).toBeGreaterThanOrEqual(1)
        expect(insightsHarvests.length).toBeGreaterThanOrEqual(1)
        expect(logsHarvest.length).toBeGreaterThanOrEqual(1)

        // each type of test should check that:
        // each payload exists once per appId
        // each payload should have internal attributes matching it to the right appId
        rumHarvests.forEach(({ request: { query, body } }) => {
          expect(ranOnce(query.a, 'rum')).toEqual(true)
        })

        errorsHarvests.forEach(({ request: { query, body } }) => {
          const data = body.err
          data.forEach((err, idx) => {
            const id = err.custom['mfe.id'] || query.a // MFEs use mfe.id, regular agents use appId
            if (Number(id) !== 42 && testSet.includes('register.jserrors')) {
              expect(err.custom['mfe.name']).toEqual('agent' + id)
              expect(err.custom.eventSource).toEqual('MicroFrontendBrowserAgent')
              expect(err.custom['parent.id']).toEqual(containerAgentEntityGuid)
            } else {
              if (testSet.includes('register') && testSet.includes('register.jserrors')) {
                expect(err.custom.appId).toEqual(42)
              }
            }
            countRuns(id, 'err')
            if (testSet.includes('register.jserrors')) {
              expect(ranOnce(id, 'err')).toEqual(true)
              expect(Number(id)).toEqual(Number(err.params.message))
            } else {
              expect(tests[id].err).toEqual(idx + 1) // each error gets lumped together under the same id without the feature flags
              expect(Number(id)).toEqual(42)
            }
          })
        })

        insightsHarvests.forEach(({ request: { query, body } }) => {
          const data = body.ins
          data.forEach((ins, idx) => {
            if (ins.eventType === 'PageAction' || ins.eventType === 'CustomEvent' || (ins.eventType === 'BrowserPerformance' && ins.entryType === 'measure')) {
              const id = ins['mfe.id'] || query.a // MFEs use mfe.id, regular agents use appId
              if (Number(id) !== 42 && testSet.includes('register.generic_events')) {
                expect(ins['mfe.name']).toEqual('agent' + id)
                expect(ins.eventSource).toEqual('MicroFrontendBrowserAgent')
                expect(ins['parent.id']).toEqual(containerAgentEntityGuid)
              } else {
                if (testSet.includes('register') && testSet.includes('register.generic_events')) {
                  expect(ins.appId).toEqual(42)
                }
              }

              let countType
              if (ins.eventType === 'PageAction') {
                countType = 'pa'
              } else if (ins.eventType === 'CustomEvent') {
                countType = 'rce'
              } else if (ins.eventType === 'BrowserPerformance') {
                countType = 'measure'
              }
              countRuns(id, countType)
            }
          })
        })

        if (!testSet.includes('register.generic_events')) {
        // each item gets lumped together under the same id without the feature flags
          expect(tests['42'].pa).toEqual(testSet.includes('register') ? 3 : 1)
          expect(tests['42'].rce).toEqual(testSet.includes('register') ? 3 : 1)
          expect(tests['42'].measure).toEqual(testSet.includes('register') ? 3 : 1)
        } else {
          if (testSet.includes('register')) {
            expect(ranOnce('42', 'pa')).toEqual(true)
            expect(ranOnce('42', 'rce')).toEqual(true)
            expect(ranOnce('42', 'measure')).toEqual(true)
            expect(ranOnce('1', 'pa')).toEqual(true)
            expect(ranOnce('1', 'rce')).toEqual(true)
            expect(ranOnce('1', 'measure')).toEqual(true)
            expect(ranOnce('2', 'pa')).toEqual(true)
            expect(ranOnce('2', 'rce')).toEqual(true)
            expect(ranOnce('2', 'measure')).toEqual(true)
          }
        }

        logsHarvest.forEach(({ request: { query, body } }) => {
          const data = JSON.parse(body)[0]
          data.logs.forEach(log => {
            const id = log.attributes['mfe.id'] || 42 // MFEs use mfe.id, regular agents supply entity guid so just force it to 42 here if mfe id is not present
            if (Number(id) !== 42 && testSet.includes('register')) {
              expect(log.attributes['mfe.name']).toEqual('agent' + id)
              expect(log.attributes.eventSource).toEqual('MicroFrontendBrowserAgent')
              expect(log.attributes['parent.id']).toEqual(containerAgentEntityGuid)
            } else {
              if (testSet.includes('register')) {
                expect(log.attributes.appId).toEqual(42)
              }
            }
            expect(ranOnce(id, 'log')).toEqual(true)
            expect(Number(id)).toEqual(Number(log.message))
          })
        })

        function ranOnce (appId, type) {
          if (tests[appId][type] > 1) return false
          countRuns(appId, type)
          return true
        }

        function countRuns (appId, type) {
          tests[appId][type] ??= 0
          tests[appId][type]++
        }
      })
    })
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

      const [insResult, calledAt] = await Promise.all([
        insCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/finished.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            return window.calledAt
          }))
      ])

      const pageActions = insResult[0].request.body.ins.filter(evt => evt.eventType === 'PageAction')
      expect(pageActions).toBeDefined()
      expect(pageActions.length).toEqual(1) // exactly 1 PageAction was submitted
      expect(pageActions[0].actionName).toEqual('finished') // PageAction has actionName = finished
      expect(Math.abs((pageActions[0].timeSinceLoad * 1000) - calledAt)).toBeLessThanOrEqual(1)
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
    it('tallies metadata for jsAttributes', async () => {
      const testUrl = await browser.testHandle.assetURL('instrumented.html')
      await browser.url(testUrl)
        .then(() => browser.waitForAgentLoad())

      expect(await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.jsAttributesMetadata.bytes
      })).toEqual(0) // no attributes set yet

      await browser.execute(function () {
        newrelic.setCustomAttribute('testing', 123)
      })

      expect(await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.jsAttributesMetadata.bytes
      })).toEqual(10) // testing (7) + 123 (3) = 10

      await browser.execute(function () {
        newrelic.setCustomAttribute('testing', null)
      })

      expect(await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.jsAttributesMetadata.bytes
      })).toEqual(0)
    })

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

    it('can change persisted attribute during load race, page memory and LS', async () => {
      const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
      const testUrl = await browser.testHandle.assetURL('api/custom-attribute-persist-random.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })

      const [rumResult, randomValue] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        browser.url(testUrl)
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () { return window.value }))
      ])

      expect(rumResult[0].request.body.ja).toEqual({ testing: randomValue, 'testing-load': randomValue }) // initial page load has custom attribute

      const session = await browser.execute(function () {
        return localStorage.getItem('NRBA_SESSION')
      })
      expect(JSON.parse(session).custom.testing).toEqual(randomValue) // initial page load has custom attribute in memory
      expect(JSON.parse(session).custom['testing-load']).toEqual(randomValue) // initial page load has custom attribute in memory

      expect((await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].info.jsAttributes.testing
      }))).toEqual(randomValue) // initial page load has custom attribute in JS memory

      expect((await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].info.jsAttributes['testing-load']
      }))).toEqual(randomValue) // initial page load has custom attribute in JS memory

      await browser.testHandle.assetURL('api/custom-attribute-persist-random.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })

      const [rumResultAfterNavigate, randomValueAfterNavigate] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 2 }),
        browser.url(testUrl)
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () { return window.value }))
      ])

      expect(rumResultAfterNavigate[1].request.body.ja).toEqual({ testing: randomValueAfterNavigate, 'testing-load': randomValueAfterNavigate }) // 2nd page load has new random value
      expect(rumResultAfterNavigate[1].request.body.ja).not.toEqual({ testing: randomValue, 'testing-load': randomValueAfterNavigate }) // 2nd page load value is not first load value

      const sessionAfterNavigate = await browser.execute(function () {
        return localStorage.getItem('NRBA_SESSION')
      })
      expect(JSON.parse(sessionAfterNavigate).custom.testing).toEqual(randomValueAfterNavigate) // initial page load has custom attribute in memory
      expect(JSON.parse(sessionAfterNavigate).custom['testing-load']).toEqual(randomValueAfterNavigate) // initial page load has custom attribute in memory

      expect((await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].info.jsAttributes.testing
      }))).toEqual(randomValueAfterNavigate) // initial page load has custom attribute in JS memory
      expect((await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].info.jsAttributes['testing-load']
      }))).toEqual(randomValueAfterNavigate) // initial page load has custom attribute in JS memory
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
