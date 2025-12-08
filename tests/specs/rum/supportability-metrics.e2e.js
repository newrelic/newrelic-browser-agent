import { testRumRequest, testMetricsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('basic pve capturing', () => {
  let rumCapture
  let metricsCapture

  beforeEach(async () => {
    [rumCapture, metricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testMetricsRequest }
    ])
  })

  it('should report SMs when RUM call fails to browser connect service', async () => {
    // will reply with http status 500 to fake error response from browser connect service
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      statusCode: 500,
      permanent: true
    })

    // visit the webpage, not waiting for agent load since we don't expect the rum feature to load properly
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))

    // wait for rum response harvest
    const rumHarvest = await rumCapture.waitForResult({ totalCount: 1 })

    // RUM harvest should have the expected http status code from the bam server
    expect(rumHarvest[0].reply.statusCode).toBe(500)

    // wait for supportability metrics harvest
    const smHarvest = await metricsCapture.waitForResult({ totalCount: 1 })

    // check for expected properties on status code supportability metric
    const smHarvestStatusCode = smHarvest[0].request.body.sm.find(sm => sm.params.name === 'BCS/Error/500')
    expect(smHarvestStatusCode).toBeDefined()
    expect(smHarvestStatusCode.stats).toBeDefined()
    expect(smHarvestStatusCode.stats.c).toBe(1)

    // check for expected properties on dropped bytes supportability metric
    const smHarvestDroppedBytes = smHarvest[0].request.body.sm.find(sm => sm.params.name === 'BCS/Error/Dropped/Bytes')
    expect(smHarvestDroppedBytes).toBeDefined()
    expect(smHarvestDroppedBytes.stats).toBeDefined()
    expect(smHarvestDroppedBytes.stats.c).toBe(1)
    expect(smHarvestDroppedBytes.stats.t).toBeGreaterThan(0)

    // check for expected properties on response time supportability metric
    const smHarvestResponseTime = smHarvest[0].request.body.sm.find(sm => sm.params.name === 'BCS/Error/Duration/Ms')
    expect(smHarvestResponseTime).toBeDefined()
    expect(smHarvestResponseTime.stats).toBeDefined()
    expect(smHarvestResponseTime.stats.c).toBe(1)
    expect(smHarvestResponseTime.stats.t).toBeGreaterThan(0)
  })
})
