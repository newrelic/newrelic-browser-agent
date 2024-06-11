import { extractAjaxEvents } from '../../util/xhr'
import { browserClick } from '../util/helpers'

describe('jsonp ajax events', () => {
  [
    { type: 'basic', page: 'spa/jsonp/basic.html' },
    { type: 'jquery', page: 'spa/jsonp/jquery.html' },
    { type: 'angular1', page: 'spa/jsonp/angular1.html' }
  ].forEach(testCase => it(`should capture ${testCase.type} jsonp ajax events`, async () => {
    await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(await browser.testHandle.assetURL(testCase.page, { init: { ajax: { block_internal: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionEvents] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browserClick('body')
    ])

    const events = extractAjaxEvents(interactionEvents.request.body)
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
    const [interactionEvents] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.url(await browser.testHandle.assetURL('spa/jsonp/load.html', { init: { ajax: { block_internal: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    const events = extractAjaxEvents(interactionEvents.request.body)
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
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(await browser.testHandle.assetURL('spa/jsonp/duo.html', { init: { ajax: { block_internal: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionEvents] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browserClick('body')
    ])

    const events = extractAjaxEvents(interactionEvents.request.body)
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
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(await browser.testHandle.assetURL('spa/jsonp/plaintext.html', { init: { ajax: { block_internal: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionEvents] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browserClick('body')
    ])

    const events = extractAjaxEvents(interactionEvents.request.body)
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
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(await browser.testHandle.assetURL('spa/jsonp/error.html', { init: { ajax: { block_internal: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionEvents] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browserClick('body')
    ])

    const events = extractAjaxEvents(interactionEvents.request.body)
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
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(await browser.testHandle.assetURL('spa/jsonp/timing.html', { init: { ajax: { block_internal: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionEvents] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browserClick('body')
    ])

    const event = extractAjaxEvents(interactionEvents.request.body)
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
    expect(event.callbackDuration).toBeGreaterThanOrEqual(2000)
    expect(event.end).toBeGreaterThanOrEqual(event.start)
    expect(event.end - event.start).toBeGreaterThanOrEqual(event.callbackDuration)
  })
})
