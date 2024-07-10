import { testAjaxEventsRequest, testAjaxTimeSlicesRequest } from '../../../tools/testing-server/utils/expect-tests'
import { checkAjaxEvents, checkAjaxMetrics } from '../../util/basic-checks'

describe('xhr retry harvesting', () => {
  ;[408, 429, 500, 503].forEach(statusCode =>
    it(`should send the ajax event and metric on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      const [ajaxEventsCapture, ajaxMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testAjaxEventsRequest },
        { test: testAjaxTimeSlicesRequest }
      ])
      await browser.testHandle.scheduleReply('bamServer', {
        test: testAjaxEventsRequest,
        permanent: true,
        statusCode
      })
      await browser.testHandle.scheduleReply('bamServer', {
        test: testAjaxTimeSlicesRequest,
        permanent: true,
        statusCode
      })

      const [firstAjaxEventsHarvest, firstAjaxMetricsHarvest] = await Promise.all([
        ajaxEventsCapture.waitForResult({ totalCount: 2 }),
        ajaxMetricsCapture.waitForResult({ totalCount: 2 }),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            var xhr = new XMLHttpRequest()
            xhr.open('GET', '/json')
            xhr.send()
          }))
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondAjaxEventsHarvest, secondAjaxMetricsHarvest] = await Promise.all([
        ajaxEventsCapture.waitForResult({ timeout: 5000 }),
        ajaxMetricsCapture.waitForResult({ timeout: 5000 }),
        browser.execute(function () {
          var xhr = new XMLHttpRequest()
          xhr.open('GET', '/text')
          xhr.send()
        })
      ])

      firstAjaxEventsHarvest.forEach(harvest => {
        expect(harvest.reply.statusCode).toEqual(statusCode)
      })
      firstAjaxMetricsHarvest.forEach(harvest => {
        expect(harvest.reply.statusCode).toEqual(statusCode)
      })

      const firstAjaxEventData = firstAjaxEventsHarvest
        .flatMap(harvest => harvest.request.body)
        .find(xhr => xhr.path === '/json')
      const successfulAjaxEventHarvest = secondAjaxEventsHarvest
        .find(harvest => harvest.reply.statusCode !== statusCode)
      checkAjaxEvents(successfulAjaxEventHarvest.request, { specificPath: '/json' })
      checkAjaxEvents(successfulAjaxEventHarvest.request, { specificPath: '/text' })
      expect(successfulAjaxEventHarvest.request.body).toEqual(expect.arrayContaining([firstAjaxEventData]))

      const firstAjaxMetricData = firstAjaxMetricsHarvest
        .flatMap(harvest => harvest.request.body.xhr)
        .find(xhr => xhr.params.pathname === '/json')
      const successfulAjaxMetricsHarvest = secondAjaxMetricsHarvest
        .find(harvest => harvest.reply.statusCode !== statusCode)
      checkAjaxMetrics(successfulAjaxMetricsHarvest.request, { specificPath: '/json' })
      checkAjaxMetrics(successfulAjaxMetricsHarvest.request, { specificPath: '/text' })
      expect(successfulAjaxMetricsHarvest.request.body.xhr).toEqual(expect.arrayContaining([firstAjaxMetricData]))
    })
  )

  ;[400, 404, 502, 504, 512].forEach(statusCode =>
    it(`should not send the ajax event and metric on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      const [ajaxEventsCapture, ajaxMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testAjaxEventsRequest },
        { test: testAjaxTimeSlicesRequest }
      ])
      await browser.testHandle.scheduleReply('bamServer', {
        test: testAjaxEventsRequest,
        permanent: true,
        statusCode
      })
      await browser.testHandle.scheduleReply('bamServer', {
        test: testAjaxTimeSlicesRequest,
        permanent: true,
        statusCode
      })

      const [firstAjaxEventsHarvest, firstAjaxMetricsHarvest] = await Promise.all([
        ajaxEventsCapture.waitForResult({ totalCount: 2 }),
        ajaxMetricsCapture.waitForResult({ totalCount: 2 }),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            var xhr = new XMLHttpRequest()
            xhr.open('GET', '/json')
            xhr.send()
          }))
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondAjaxEventsHarvest, secondAjaxMetricsHarvest] = await Promise.all([
        ajaxEventsCapture.waitForResult({ timeout: 5000 }),
        ajaxMetricsCapture.waitForResult({ timeout: 5000 }),
        browser.execute(function () {
          var xhr = new XMLHttpRequest()
          xhr.open('GET', '/text')
          xhr.send()
        })
      ])

      firstAjaxEventsHarvest.forEach(harvest => {
        expect(harvest.reply.statusCode).toEqual(statusCode)
      })
      firstAjaxMetricsHarvest.forEach(harvest => {
        expect(harvest.reply.statusCode).toEqual(statusCode)
      })

      const firstAjaxEventData = firstAjaxEventsHarvest
        .flatMap(harvest => harvest.request.body)
        .find(xhr => xhr.path === '/json')
      const successfulAjaxEventHarvest = secondAjaxEventsHarvest
        .find(harvest => harvest.reply.statusCode !== statusCode)
      checkAjaxEvents(successfulAjaxEventHarvest.request, { specificPath: '/text' })
      expect(successfulAjaxEventHarvest.request.body).not.toEqual(expect.arrayContaining([firstAjaxEventData]))

      const firstAjaxMetricData = firstAjaxMetricsHarvest
        .flatMap(harvest => harvest.request.body.xhr)
        .find(xhr => xhr.params.pathname === '/json')
      const successfulAjaxMetricsHarvest = secondAjaxMetricsHarvest
        .find(harvest => harvest.reply.statusCode !== statusCode)
      checkAjaxMetrics(successfulAjaxMetricsHarvest.request, { specificPath: '/json' })
      checkAjaxMetrics(successfulAjaxMetricsHarvest.request, { specificPath: '/text' })
      expect(successfulAjaxMetricsHarvest.request.body.xhr).not.toEqual(expect.arrayContaining([firstAjaxMetricData]))
    })
  )
})
