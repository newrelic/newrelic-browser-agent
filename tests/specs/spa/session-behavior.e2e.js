import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('SPA session behavior - ', () => {
  let interactionsCapture
  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('IPL has isFirstOfSession custom attr for new sessions (only)', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html')
    let [spaHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const iplNode = spaHarvests[0].request.body[0]
    expect(iplNode.trigger).toEqual('initialPageLoad')
    const desiredAttr = iplNode.children.find(node => node.key === 'isFirstOfSession')
    expect(desiredAttr).toBeDefined()

    ;[spaHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.refresh().then(() => browser.waitForAgentLoad())
    ])
    const iplNode2 = spaHarvests[1].request.body[0]
    expect(iplNode2.trigger).toEqual('initialPageLoad')
    const desiredAttr2 = iplNode2.children.find(node => node.key === 'isFirstOfSession')
    expect(desiredAttr2).toBeUndefined() // subsequent page loads in the same session should not have this attribute
  })
})
