import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

// IE11 actually does bucket these cases, so these tests will fail. Because the cases are niche, we exclude IE11.

describe('error bucketing', () => {
  withBrowsersMatching(notIE)('NR-40043: Multiple errors with noticeError and unique messages should not bucket', async () => {
    const [errorResult] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.url(await browser.testHandle.assetURL('js-errors-noticeerror-bucketing.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errorResult.request.body.err.length).toBe(8) // should honor unique messages and not group and count at all
    errorResult.request.body.err.forEach((error, i) => {
      expect(error.params.message).toBe(`Error message ${i + 1}`) // all eight unique messages expected
    })
  })

  withBrowsersMatching(notIE)('NR-40043: Multiple errors with noticeError and unique messages should not bucket when retrying due to 429', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testErrorsRequest,
      statusCode: 429
    })

    const [firstErrorResult] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.url(await browser.testHandle.assetURL('js-errors-noticeerror-bucketing.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(firstErrorResult.reply.statusCode).toBe(429)

    const secondErrorResult = await browser.testHandle.expectErrors()

    expect(secondErrorResult.reply.statusCode).toBe(200)
    expect(firstErrorResult.request.body.err).toEqual(secondErrorResult.request.body.err) // same because it's a retry
  })

  withBrowsersMatching(notIE)('NEWRELIC-3788: Multiple identical errors from the same line but different columns should not be bucketed', async () => {
    const [errorResult] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.url(await browser.testHandle.assetURL('js-error-column-bucketing.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errorResult.request.body.err).toBeDefined() // has errors
    expect(errorResult.request.body.err.length).toBe(2) // both errors reported, not bucketed
    expect(typeof errorResult.request.body.err[0].params.stack_trace === 'string').toBeTruthy() // first error has a stack trace
    expect(typeof errorResult.request.body.err[1].params.stack_trace === 'string').toBeTruthy() // second error has a stack trace
  })

  withBrowsersMatching(notIE)('NEWRELIC-3788: Multiple identical errors from the same line but different columns should not be bucketed when retrying due to 429', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testErrorsRequest,
      statusCode: 429
    })

    const [firstErrorResult] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.url(await browser.testHandle.assetURL('js-error-column-bucketing.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(firstErrorResult.reply.statusCode).toBe(429)

    const secondErrorResult = await browser.testHandle.expectErrors()

    expect(secondErrorResult.reply.statusCode).toBe(200)
    expect(secondErrorResult.request.body.err).toBeDefined() // has errors
    expect(secondErrorResult.request.body.err).toEqual(firstErrorResult.request.body.err) // same because it's a retry
    expect(secondErrorResult.request.body.err.length).toBe(2) // both errors reported, not bucketed
  })
})
