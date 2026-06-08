import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('newrelic api', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  describe('release()', () => {
    it('adds releases to jserrors', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/release.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(errorsResult[0].request.query.ri).toEqual('{"example":"123","other":"456"}')
    })

    it('limits releases to jserrors', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/release-too-many.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(JSON.parse(errorsResult[0].request.query.ri)).toEqual({
        one: '1',
        two: '2',
        three: '3',
        four: '4',
        five: '5',
        six: '6',
        seven: '7',
        eight: '8',
        nine: '9',
        ten: '10'
      })
    })

    it('limits size in jserrors payload', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/release-too-long.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      const queryRi = JSON.parse(errorsResult[0].request.query.ri)
      expect(queryRi.one).toEqual('201')
      expect(queryRi.three).toMatch(/y{99}x{100}q/)
      expect(Object.keys(queryRi).find(element => element.match(/y{99}x{100}q/))).toBeTruthy()
    })

    it('does not set ri query param if release() is not called', async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })

      const [errorsResult] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/no-release.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(errorsResult[0].request.query).not.toHaveProperty('ri')
    })
  })
})
