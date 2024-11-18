import { extractAjaxEvents } from '../../util/xhr'
import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('jsonp ajax events', () => {
  const config = {
    loader: 'spa',
    init: {
      feature_flags: ['soft_nav'],
      ajax: { block_internal: false }
    }
  }
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  it('should capture jsonp calls even when the response is not JS', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/jsonp/plaintext.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('body').click()
    ])

    expect(interactionHarvests.length).toEqual(2)
    const events = extractAjaxEvents(interactionHarvests[1].request.body)
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        method: 'GET',
        path: '/jsonp',
        requestBodySize: 0,
        requestedWith: 'JSONP',
        responseBodySize: 0,
        status: 200,
        type: 'ajax'
      })
    ]))
  })

  it('should capture failed jsonp calls', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/jsonp/error.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('body').click()
    ])

    expect(interactionHarvests.length).toEqual(2)
    const events = extractAjaxEvents(interactionHarvests[1].request.body)
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        method: 'GET',
        path: '/nonexistent',
        requestBodySize: 0,
        requestedWith: 'JSONP',
        responseBodySize: 0,
        status: 0,
        type: 'ajax'
      })
    ]))
  })
})
