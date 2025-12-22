import { checkAjaxEvents, checkJsErrors, checkMetrics, checkGenericEvents, checkPVT, checkRumBody, checkRumQuery, checkSessionTrace, checkSpa } from '../../util/basic-checks'
import { testAjaxEventsRequest, testBlobTraceRequest, testErrorsRequest, testInsRequest, testInteractionEventsRequest, testMetricsRequest, testRumRequest, testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('newrelic api', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
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
