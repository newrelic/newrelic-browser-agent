import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('newrelic api', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  describe('finished()', () => {
    it('records a PageAction when called before RUM message', async () => {
      const insCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })

      const [insResult, calledAt] = await Promise.all([
        insCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api/finished.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            return window.calledAt
          }))
      ])

      const pageActions = insResult[0].request.body.ins.filter(evt => evt.eventType === 'PageAction')
      expect(pageActions).toBeDefined()
      expect(pageActions.length).toEqual(1) // exactly 1 PageAction was submitted
      expect(pageActions[0].actionName).toEqual('finished') // PageAction has actionName = finished
      expect(Math.abs((pageActions[0].timeSinceLoad * 1000) - calledAt)).toBeLessThanOrEqual(1)
    })
  })
})
