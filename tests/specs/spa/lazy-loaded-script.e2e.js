import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe.skip('lazy loaded scripts', () => {
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  it('interactions wait for external scripts to complete', async () => {
    const url = await browser.testHandle.assetURL('spa/external-scripts/lazy-loaded-script.html')

    await browser.url(url).then(() => browser.waitForAgentLoad())
    $('body').click()
    await browser.waitUntil(
      () => browser.execute(function () { return window.globalCallbackDone === true }),
      { timeout: 5000 }
    )
    const ixns = await interactionsCapture.waitForResult({ totalCount: 2 })
    const clickIxn = ixns[1].request.body[0]
    expect(clickIxn.callbackDuration).toBeGreaterThan(0)
    const duration = clickIxn.end - clickIxn.start
    expect(duration).toBeGreaterThan(0)
    expect(duration).toBeLessThan(1000)
  })

  it('ajax call in lazy script extends interaction', async () => {
    const url = await browser.testHandle.assetURL('spa/external-scripts/script-with-ajax.html')

    await browser.url(url).then(() => browser.waitForAgentLoad())
    $('body').click()

    const ixns = await interactionsCapture.waitForResult({ totalCount: 2 })
    const clickIxn = ixns[1].request.body[0]

    expect(clickIxn.children.length).toEqual(1)
    expect(clickIxn.children[0].type).toEqual('ajax')
    expect(clickIxn.end).toBeGreaterThanOrEqual(clickIxn.children[0].end) // interaction end should be same or higher than the delayed ajax
  })

  it('errored script', async () => {
    const url = await browser.testHandle.assetURL('spa/external-scripts/aborted-script.html')

    await browser.url(url).then(() => browser.waitForAgentLoad())
    $('body').click()

    const ixns = await interactionsCapture.waitForResult({ totalCount: 2 })
    const clickIxn = ixns[1].request.body[0]

    const duration = clickIxn.end - clickIxn.start
    expect(duration).toBeGreaterThan(0)
    expect(duration).toBeLessThan(1000)
  })
})
