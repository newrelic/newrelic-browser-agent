import { extractAjaxEvents } from '../../util/xhr'
import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('jsonp ajax events', () => {
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  ;[
    { type: 'basic', page: 'spa/jsonp/basic.html' },
    { type: 'jquery', page: 'spa/jsonp/jquery.html' },
    { type: 'angular1', page: 'spa/jsonp/angular1.html' }
  ].forEach(testCase => it(`should capture ${testCase.type} jsonp ajax events`, async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL(testCase.page, { init: { ajax: { block_internal: false } } }))
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
        type: 'ajax',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'customTracer',
            name: 'tacoTimer'
          })
        ])
      })
    ]))
  }))

  it('should capture jsonp calls on the initial page load interaction', async () => {
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('spa/jsonp/load.html', { init: { ajax: { block_internal: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    const events = extractAjaxEvents(interactionHarvests[0].request.body)
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        method: 'GET',
        path: '/jsonp',
        requestBodySize: 0,
        requestedWith: 'JSONP',
        responseBodySize: 0,
        status: 200,
        type: 'ajax',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'customTracer',
            name: 'tacoTimer'
          })
        ])
      })
    ]))
  })

  it('should capture two jsonp calls', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('spa/jsonp/duo.html', { init: { ajax: { block_internal: false } } }))
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
        type: 'ajax',
        children: expect.arrayContaining([
          expect.objectContaining({
            name: 'tacoTimer1'
          })
        ])
      }),
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        method: 'GET',
        path: '/jsonp',
        requestBodySize: 0,
        requestedWith: 'JSONP',
        responseBodySize: 0,
        status: 200,
        type: 'ajax',
        children: expect.arrayContaining([
          expect.objectContaining({
            name: 'tacoTimer2'
          })
        ])
      })
    ]))
  })

  it('should capture jsonp calls even when the response is not JS', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('spa/jsonp/plaintext.html', { init: { ajax: { block_internal: false } } }))
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
      browser.url(await browser.testHandle.assetURL('spa/jsonp/error.html', { init: { ajax: { block_internal: false } } }))
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

  it('should capture jsonp timings correctly', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('spa/jsonp/timing.html', { init: { ajax: { block_internal: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('body').click()
    ])

    expect(interactionHarvests.length).toEqual(2)
    const event = extractAjaxEvents(interactionHarvests[1].request.body)
      .find(ev => ev.path === '/jsonp' && ev.requestedWith === 'JSONP')
    expect(event).toEqual(expect.objectContaining({
      domain: expect.stringContaining('bam-test-1.nr-local.net'),
      method: 'GET',
      path: '/jsonp',
      requestBodySize: 0,
      requestedWith: 'JSONP',
      responseBodySize: 0,
      status: 200,
      type: 'ajax'
    }))
    expect(event.callbackDuration).toBeGreaterThanOrEqual(1999)
    expect(event.end).toBeGreaterThanOrEqual(event.start)
    expect(event.end - event.start).toBeGreaterThanOrEqual(event.callbackDuration)
  })
})
