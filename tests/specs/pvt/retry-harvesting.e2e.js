import { testMetricsRequest, testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('pvt harvesting', () => {
  const localConfig = {
    init: {
      page_view_timing: {
        enabled: true
      },
      harvest: {
        interval: 2
      }
    }
  }
  let timingsCapture, metricsCapture

  beforeEach(async () => {
    ;[metricsCapture, timingsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMetricsRequest },
      { test: testTimingEventsRequest }
    ])
  })

  ;[408, 429, 500, 502, 504, 512, 530].forEach(statusCode => {
    it('timings are retried when collector returns ' + statusCode, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testTimingEventsRequest,
        permanent: true,
        statusCode
      })
      let url = await browser.testHandle.assetURL('instrumented.html', localConfig)
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

  it('generates a SM when retry succeeds', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testTimingEventsRequest,
      permanent: true,
      statusCode: 500
    })
    let url = await browser.testHandle.assetURL('instrumented.html', localConfig)
    await Promise.all([
      timingsCapture.waitForResult({ totalCount: 1 }),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    await browser.testHandle.clearScheduledReplies('bamServer')
    await timingsCapture.waitForResult({ totalCount: 2 })

    const offPageUrl = await browser.testHandle.assetURL('/')
    const [metricsHarvest] = await Promise.all([
      metricsCapture.waitForResult({ totalCount: 1 }),
      browser.url(offPageUrl)
    ])

    const smArray = metricsHarvest[0].request.body.sm
    expect(smArray).toEqual(expect.arrayContaining([{
      params: { name: 'Harvester/Retry/Succeeded/500' },
      stats: { c: 1 }
    }]))
  })
  it('generates a SM when retry fails', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testTimingEventsRequest,
      permanent: true,
      statusCode: 512
    })
    let url = await browser.testHandle.assetURL('instrumented.html', localConfig)
    await Promise.all([
      timingsCapture.waitForResult({ totalCount: 1 }),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])
    await timingsCapture.waitForResult({ totalCount: 2 })

    const offPageUrl = await browser.testHandle.assetURL('/')
    const [metricsHarvest] = await Promise.all([
      metricsCapture.waitForResult({ totalCount: 1 }),
      browser.url(offPageUrl)
    ])

    const smArray = metricsHarvest[0].request.body.sm
    expect(smArray).toEqual(expect.arrayContaining([{
      params: { name: 'Harvester/Retry/Failed/512' },
      stats: { c: 1 }
    }]))
  })

  ;[400, 404].forEach(statusCode => {
    it('timings are NOT retried when collector returns ' + statusCode, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testTimingEventsRequest,
        permanent: true,
        statusCode
      })
      let url = await browser.testHandle.assetURL('instrumented.html', localConfig)
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
