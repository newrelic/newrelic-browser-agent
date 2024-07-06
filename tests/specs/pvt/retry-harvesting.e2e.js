import { testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('pvt harvesting', () => {
  ;[408, 429, 500, 503].forEach(statusCode => {
    it('timings are retried when collector returns ' + statusCode, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testTimingEventsRequest,
        permanent: true,
        statusCode
      })
      let url = await browser.testHandle.assetURL('instrumented.html', {
        init: {
          page_view_timing: {
            enabled: true,
            harvestTimeSeconds: 2
          },
          harvest: {
            tooManyRequestsDelay: 5
          }
        }
      })
      const [firstTimingsHarvest] = await Promise.all([
        browser.testHandle.expectTimings(),
        browser.url(url).then(() => browser.waitForAgentLoad())
      ])

      await browser.testHandle.clearScheduledReplies('bamServer')
      const secondTimingsHarvest = await browser.testHandle.expectTimings(10000)

      expect(firstTimingsHarvest.reply.statusCode).toEqual(statusCode)
      expect(secondTimingsHarvest.request.body).toEqual(expect.arrayContaining(firstTimingsHarvest.request.body))
    })
  })

  ;[400, 404, 502, 504, 512].forEach(statusCode => {
    it('timings are NOT retried when collector returns ' + statusCode, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testTimingEventsRequest,
        permanent: true,
        statusCode
      })
      let url = await browser.testHandle.assetURL('instrumented.html', {
        init: {
          page_view_timing: {
            enabled: true,
            harvestTimeSeconds: 2
          },
          harvest: {
            tooManyRequestsDelay: 5
          }
        }
      })
      const [firstTimingsHarvest] = await Promise.all([
        browser.testHandle.expectTimings(),
        browser.url(url).then(() => browser.waitForAgentLoad())
      ])

      await browser.testHandle.clearScheduledReplies('bamServer')
      const [secondTimingsHarvest] = await Promise.all([
        browser.testHandle.expectTimings(),
        $('body').click()
          .then(() => browser.url(url).then(() => browser.waitForAgentLoad()))
      ])

      expect(secondTimingsHarvest.request.body).not.toEqual(expect.arrayContaining(firstTimingsHarvest.request.body))
    })
  })
})
