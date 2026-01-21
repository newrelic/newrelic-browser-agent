import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('newrelic api', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  describe('noticeError()', () => {
    it('takes an error object', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResults] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api.html')) // Setup expects before loading the page
          .then(() => browser.waitForAgentLoad())
      ])

      expect(Array.isArray(errorsResults[0].request.body.err)).toEqual(true)
      expect(errorsResults[0].request.body.err.length).toBeGreaterThan(0)

      const params = errorsResults[0].request.body.err[0].params

      expect(params).toBeDefined()
      expect(params.exceptionClass).toEqual('Error')
      expect(params.message).toEqual('no free taco coupons')
    })

    it('takes a string', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResults] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/noticeError.html')) // Setup expects before loading the page
          .then(() => browser.waitForAgentLoad())
      ])

      expect(Array.isArray(errorsResults[0].request.body.err)).toEqual(true)
      expect(errorsResults[0].request.body.err.length).toBeGreaterThan(0)

      const params = errorsResults[0].request.body.err[0].params

      expect(params).toBeDefined()
      expect(params.exceptionClass).toEqual('Error')
      expect(params.message).toEqual('too many free taco coupons')
    })
  })
})
