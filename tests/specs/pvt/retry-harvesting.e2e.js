import { testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('pvt harvesting', () => {
  let timingsCapture

  beforeEach(async () => {
    timingsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testTimingEventsRequest })
  })

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
        timingsCapture.waitForResult({ totalCount: 1 }),
        browser.url(url).then(() => browser.waitForAgentLoad())
      ])

      await browser.testHandle.clearScheduledReplies('bamServer')
      const secondTimingsHarvest = await timingsCapture.waitForResult({ totalCount: 2 })

      expect(firstTimingsHarvest[0].reply.statusCode).toEqual(statusCode)
      expect(secondTimingsHarvest[1].request.body).toEqual(expect.arrayContaining(firstTimingsHarvest[0].request.body))
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
        timingsCapture.waitForResult({ totalCount: 1 }),
        browser.url(url).then(() => browser.waitForAgentLoad())
      ])

      await browser.testHandle.clearScheduledReplies('bamServer')
      const [secondTimingsHarvest] = await Promise.all([
        timingsCapture.waitForResult({ totalCount: 2 }),
        $('body').click()
          .then(() => browser.url(url).then(() => browser.waitForAgentLoad()))
      ])

      expect(secondTimingsHarvest[1].request.body).not.toEqual(expect.arrayContaining(firstTimingsHarvest[0].request.body))
    })
  })
})
