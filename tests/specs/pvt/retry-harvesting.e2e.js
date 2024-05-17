import { testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('pvt harvesting', () => {
  it('timings are retried when collector returns 429', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testTimingEventsRequest,
      permanent: true,
      statusCode: 429
    })
    let url = await browser.testHandle.assetURL('instrumented.html', {
      init: {
        page_view_timing: {
          enabled: true,
          initialHarvestSeconds: 2,
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

    expect(firstTimingsHarvest.reply.statusCode).toEqual(429)
    expect(secondTimingsHarvest.request.body).toEqual(expect.arrayContaining(firstTimingsHarvest.request.body))
  })
})
