import { faker } from '@faker-js/faker'
import { testExpectedTrace } from '../util/helpers'
import { testAjaxEventsRequest, testAjaxTimeSlicesRequest, testBlobTraceRequest, testErrorsRequest, testInsRequest, testInteractionEventsRequest, testRumRequest, testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('harvesting', () => {
  let rumCapture
  let timingEventsCapture
  let ajaxEventsCapture
  let ajaxMetricsCapture
  let traceCapture
  let insightsCapture
  let interactionEventsCapture
  let errorMetricsCapture

  beforeEach(async () => {
    [rumCapture, timingEventsCapture, ajaxEventsCapture, ajaxMetricsCapture, traceCapture, insightsCapture, interactionEventsCapture, errorMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testTimingEventsRequest },
      { test: testAjaxEventsRequest },
      { test: testAjaxTimeSlicesRequest },
      { test: testBlobTraceRequest },
      { test: testInsRequest },
      { test: testInteractionEventsRequest },
      { test: testErrorsRequest }
    ])
  })

  it('should include the base query parameters', async () => {
    const testURL = await browser.testHandle.assetURL('obfuscate-pii.html', {
      config: {
        sa: 1
      }
    })

    const [
      rumHarvests,
      timingEventsHarvests,
      ajaxEventsHarvests,
      ajaxMetricsHarvests,
      insightsHarvests,
      interactionEventsHarvests
    ] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      timingEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      insightsCapture.waitForResult({ totalCount: 1 }),
      interactionEventsCapture.waitForResult({ totalCount: 1 }),
      browser.url(testURL)
        .then(() => browser.waitForAgentLoad())
        .then(() => $('a').click())
    ])

    const expectedURL = testURL.split('?')[0]
    rumHarvests.forEach(harvest => verifyBaseQueryParameters(harvest.request.query, expectedURL))
    timingEventsHarvests.forEach(harvest => verifyBaseQueryParameters(harvest.request.query, expectedURL))
    ajaxEventsHarvests.forEach(harvest => verifyBaseQueryParameters(harvest.request.query, expectedURL))
    ajaxMetricsHarvests.forEach(harvest => verifyBaseQueryParameters(harvest.request.query, expectedURL))
    insightsHarvests.forEach(harvest => verifyBaseQueryParameters(harvest.request.query, expectedURL))
    interactionEventsHarvests.forEach(harvest => verifyBaseQueryParameters(harvest.request.query, expectedURL))
  })

  it('should include the same ptid query parameter on requests', async () => {
    await browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
      .then(() => browser.waitForAgentLoad())

    const [
      rumHarvests,
      timingEventsHarvests,
      ajaxEventsHarvests,
      ajaxMetricsHarvests,
      traceHarvests
    ] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      timingEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      traceCapture.waitForResult({ totalCount: 1 })
    ])

    const ptid = rumHarvests[0].request.query.ptid
    timingEventsHarvests.forEach(harvest => expect(harvest.request.query.ptid).toEqual(ptid))
    ajaxEventsHarvests.forEach(harvest => expect(harvest.request.query.ptid).toEqual(ptid))
    ajaxMetricsHarvests.forEach(harvest => expect(harvest.request.query.ptid).toEqual(ptid))
    traceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request, ptid }))
  })

  it('should include the transaction name (transactionName) passed in the info block in the query parameters', async () => {
    const transactionName = faker.string.uuid()
    const testURL = await browser.testHandle.assetURL('obfuscate-pii.html', {
      config: {
        transactionName
      }
    })

    const [
      rumHarvests,
      timingEventsHarvests,
      ajaxEventsHarvests,
      ajaxMetricsHarvests,
      insightsHarvests,
      interactionEventsHarvests
    ] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      timingEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      insightsCapture.waitForResult({ totalCount: 1 }),
      interactionEventsCapture.waitForResult({ totalCount: 1 }),
      browser.url(testURL)
        .then(() => browser.waitForAgentLoad())
        .then(() => $('a').click())
    ])

    rumHarvests.forEach(harvest => expect(harvest.request.query.to).toEqual(transactionName))
    timingEventsHarvests.forEach(harvest => expect(harvest.request.query.to).toEqual(transactionName))
    ajaxEventsHarvests.forEach(harvest => expect(harvest.request.query.to).toEqual(transactionName))
    ajaxMetricsHarvests.forEach(harvest => expect(harvest.request.query.to).toEqual(transactionName))
    insightsHarvests.forEach(harvest => expect(harvest.request.query.to).toEqual(transactionName))
    interactionEventsHarvests.forEach(harvest => expect(harvest.request.query.to).toEqual(transactionName))
  })

  it('should include the transaction name (tNamePlain) passed in the info block in the query parameters', async () => {
    const transactionName = faker.string.uuid()
    const testURL = await browser.testHandle.assetURL('obfuscate-pii.html', {
      config: {
        tNamePlain: transactionName
      }
    })

    const [
      rumHarvests,
      timingEventsHarvests,
      ajaxEventsHarvests,
      ajaxMetricsHarvests,
      insightsHarvests,
      interactionEventsHarvests
    ] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      timingEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      insightsCapture.waitForResult({ totalCount: 1 }),
      interactionEventsCapture.waitForResult({ totalCount: 1 }),
      browser.url(testURL)
        .then(() => browser.waitForAgentLoad())
        .then(() => $('a').click())
    ])

    rumHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toEqual(transactionName)
      expect(harvest.request.query.to).toBeUndefined()
    })
    timingEventsHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toEqual(transactionName)
      expect(harvest.request.query.to).toBeUndefined()
    })
    ajaxEventsHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toEqual(transactionName)
      expect(harvest.request.query.to).toBeUndefined()
    })
    ajaxMetricsHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toEqual(transactionName)
      expect(harvest.request.query.to).toBeUndefined()
    })
    insightsHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toEqual(transactionName)
      expect(harvest.request.query.to).toBeUndefined()
    })
    interactionEventsHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toEqual(transactionName)
      expect(harvest.request.query.to).toBeUndefined()
    })
  })

  it('should always take the transactionName info parameter over the tNamePlan info parameter for the transaction name query parameter', async () => {
    const transactionName = faker.string.uuid()
    const testURL = await browser.testHandle.assetURL('obfuscate-pii.html', {
      config: {
        tNamePlain: faker.string.uuid(),
        transactionName
      }
    })

    const [
      rumHarvests,
      timingEventsHarvests,
      ajaxEventsHarvests,
      ajaxMetricsHarvests,
      insightsHarvests,
      interactionEventsHarvests
    ] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      timingEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      insightsCapture.waitForResult({ totalCount: 1 }),
      interactionEventsCapture.waitForResult({ totalCount: 1 }),
      browser.url(testURL)
        .then(() => browser.waitForAgentLoad())
        .then(() => $('a').click())
    ])

    rumHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toBeUndefined()
      expect(harvest.request.query.to).toEqual(transactionName)
    })
    timingEventsHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toBeUndefined()
      expect(harvest.request.query.to).toEqual(transactionName)
    })
    ajaxEventsHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toBeUndefined()
      expect(harvest.request.query.to).toEqual(transactionName)
    })
    ajaxMetricsHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toBeUndefined()
      expect(harvest.request.query.to).toEqual(transactionName)
    })
    insightsHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toBeUndefined()
      expect(harvest.request.query.to).toEqual(transactionName)
    })
    interactionEventsHarvests.forEach(harvest => {
      expect(harvest.request.query.t).toBeUndefined()
      expect(harvest.request.query.to).toEqual(transactionName)
    })
  })

  it('should update the ref query parameter when url is changes using pushState during load', async () => {
    const originalURL = await browser.testHandle.assetURL('referrer-pushstate.html')
    const redirectURL = await browser.testHandle.assetURL('instrumented.html')

    const [
      rumHarvests,
      timingEventsHarvests,
      ajaxEventsHarvests,
      ajaxMetricsHarvests,
      interactionEventsHarvests
    ] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      timingEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      interactionEventsCapture.waitForResult({ totalCount: 1 }),
      browser.url(originalURL)
        .then(() => browser.waitForAgentLoad())
    ])

    const expectedURL = redirectURL.split('?')[0]
    rumHarvests.forEach(harvest => expect(harvest.request.query.ref).toEqual(expectedURL))
    timingEventsHarvests.forEach(harvest => expect(harvest.request.query.ref).toEqual(expectedURL))
    ajaxEventsHarvests.forEach(harvest => expect(harvest.request.query.ref).toEqual(expectedURL))
    ajaxMetricsHarvests.forEach(harvest => expect(harvest.request.query.ref).toEqual(expectedURL))
    interactionEventsHarvests.forEach(harvest => expect(harvest.request.query.ref).toEqual(expectedURL))
  })

  it('should update the ref query parameter when url is changes using replaceState during load', async () => {
    const originalURL = await browser.testHandle.assetURL('referrer-replacestate.html')
    const redirectURL = await browser.testHandle.assetURL('instrumented.html')

    const [
      rumHarvests,
      timingEventsHarvests,
      ajaxEventsHarvests,
      ajaxMetricsHarvests,
      interactionEventsHarvests
    ] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      timingEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      interactionEventsCapture.waitForResult({ totalCount: 1 }),
      browser.url(originalURL)
        .then(() => browser.waitForAgentLoad())
    ])

    const expectedURL = redirectURL.split('?')[0]
    rumHarvests.forEach(harvest => expect(harvest.request.query.ref).toEqual(expectedURL))
    timingEventsHarvests.forEach(harvest => expect(harvest.request.query.ref).toEqual(expectedURL))
    ajaxEventsHarvests.forEach(harvest => expect(harvest.request.query.ref).toEqual(expectedURL))
    ajaxMetricsHarvests.forEach(harvest => expect(harvest.request.query.ref).toEqual(expectedURL))
    interactionEventsHarvests.forEach(harvest => expect(harvest.request.query.ref).toEqual(expectedURL))
  })

  it('should set session query parameter to 0 when cookies_enabled is false', async () => {
    const testURL = await browser.testHandle.assetURL('obfuscate-pii.html', {
      init: {
        privacy: {
          cookies_enabled: false
        }
      }
    })

    const [
      rumHarvests,
      timingEventsHarvests,
      ajaxEventsHarvests,
      ajaxMetricsHarvests,
      interactionEventsHarvests
    ] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      timingEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      interactionEventsCapture.waitForResult({ totalCount: 1 }),
      browser.url(testURL)
        .then(() => browser.waitForAgentLoad())
    ])

    rumHarvests.forEach(harvest => expect(harvest.request.query.s).toEqual('0'))
    timingEventsHarvests.forEach(harvest => expect(harvest.request.query.s).toEqual('0'))
    ajaxEventsHarvests.forEach(harvest => expect(harvest.request.query.s).toEqual('0'))
    ajaxMetricsHarvests.forEach(harvest => expect(harvest.request.query.s).toEqual('0'))
    interactionEventsHarvests.forEach(harvest => expect(harvest.request.query.s).toEqual('0'))
  })

  it('should not harvest features when there is no data', async () => {
    const [
      insightsHarvests,
      errorMetricsHarvests
    ] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 }),
      errorMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(insightsHarvests).toEqual([])
    expect(errorMetricsHarvests).toEqual([])
  })
})

function verifyBaseQueryParameters (queryParams, expectedURL) {
  expect(queryParams.a).toEqual('42')
  expect(queryParams.sa).toEqual('1')
  expect(queryParams.v).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/)
  expect(queryParams.t).toEqual('Unnamed Transaction')
  expect(queryParams.rst).toMatch(/^\d{1,5}$/)
  expect(queryParams.s).toMatch(/^[A-F\d]{16}$/i)
  expect(queryParams.ref).toEqual(expectedURL)
}
