import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('behavior tests', () => {
  describe('addEventListener', () => {
    it('overwriting strict window.addEventListener does not break agent', async () => {
      await browser.url(
        await browser.testHandle.assetURL('spa/overwrite-add-event-listener.html')
      ).then(() => browser.waitForAgentLoad())

      await browser.waitUntil(() => browser.execute(function () {
        return window.test.ran && window.test.passed
      }),
      {
        timeout: 10000,
        timeoutMsg: 'Conditions never passed'
      })
    })
  })

  describe('lite loader behaviors with SPA', () => {
    it('using SPA apis with lite loader still allows callbacks to fire', async () => {
      await browser.url(
        await browser.testHandle.assetURL('spa/api-tracers.html', { loader: 'rum' })
      ).then(() => browser.waitForAgentLoad())

      await $('body').click()

      await browser.waitUntil(() => browser.execute(function () {
        return window.firedCallbacks.syncCallback && window.firedCallbacks.asyncCallback
      }),
      {
        timeout: 10000,
        timeoutMsg: 'Conditions never passed'
      })
    })
  })

  it('SPA captures ixn even with incorrect setTimeout arg', async () => {
    const interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.url(await browser.testHandle.assetURL('spa/incorrect-timer.html'))
        .then(() => browser.waitForAgentLoad())
        .then(() => $('body').click())
    ])

    expect(interactionHarvests[1].request.body[0].category).toEqual('Route change')
  })
})
