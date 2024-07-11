import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

// IE11 actually does bucket these cases, so these tests will fail. Because the cases are niche, we exclude IE11.

describe.withBrowsersMatching(notIE)('error bucketing', () => {
  let errorsCapture

  beforeEach(async () => {
    errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
  })

  it('NR-40043: Multiple errors with noticeError and unique messages should not bucket', async () => {
    const [errorResult] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('js-errors-noticeerror-bucketing.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errorResult[0].request.body.err.length).toBe(8) // should honor unique messages and not group and count at all
    errorResult[0].request.body.err.forEach((error, i) => {
      expect(error.params.message).toBe(`Error message ${i + 1}`) // all eight unique messages expected
    })
  })

  it('NR-40043: Multiple errors with noticeError and unique messages should not bucket when retrying due to 429', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testErrorsRequest,
      statusCode: 429
    })

    const [firstErrorResult] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('js-errors-noticeerror-bucketing.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(firstErrorResult[0].reply.statusCode).toBe(429)

    const secondErrorResult = await errorsCapture.waitForResult({ totalCount: 2 })

    expect(secondErrorResult[1].reply.statusCode).toBe(200)
    expect(firstErrorResult[0].request.body.err).toEqual(secondErrorResult[1].request.body.err) // same because it's a retry
  })

  it('NEWRELIC-3788: Multiple identical errors from the same line but different columns should not be bucketed', async () => {
    const [errorResult] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('js-error-column-bucketing.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errorResult[0].request.body.err).toBeDefined() // has errors
    expect(errorResult[0].request.body.err.length).toBe(2) // both errors reported, not bucketed
    expect(typeof errorResult[0].request.body.err[0].params.stack_trace === 'string').toBeTruthy() // first error has a stack trace
    expect(typeof errorResult[0].request.body.err[1].params.stack_trace === 'string').toBeTruthy() // second error has a stack trace
  })

  it('NEWRELIC-3788: Multiple identical errors from the same line but different columns should not be bucketed when retrying due to 429', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testErrorsRequest,
      statusCode: 429
    })

    const [firstErrorResult] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('js-error-column-bucketing.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(firstErrorResult[0].reply.statusCode).toBe(429)

    const secondErrorResult = await errorsCapture.waitForResult({ totalCount: 2 })

    expect(secondErrorResult[1].reply.statusCode).toBe(200)
    expect(secondErrorResult[1].request.body.err).toBeDefined() // has errors
    expect(secondErrorResult[1].request.body.err).toEqual(firstErrorResult[0].request.body.err) // same because it's a retry
    expect(secondErrorResult[1].request.body.err.length).toBe(2) // both errors reported, not bucketed
  })
})
