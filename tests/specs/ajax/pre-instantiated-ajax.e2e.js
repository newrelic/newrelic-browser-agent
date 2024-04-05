import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('ajax events sent before the page loads are still captured in a basic way', () => {
  it('ajax calls before agent is loaded are captured', async () => {
    await browser.url(await browser.testHandle.assetURL('early-ajax-deferred-loader.html', { init: { ajax: { block_internal: false } } })) // Setup expects before loading the page

    const [ajaxEvents] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.waitForAgentLoad()
    ])

    const json = ajaxEvents.request.body.find(x => x.path === '/json') // xhr
    expect(json).toMatchObject({
      callbackDuration: 0, // cant capture with API
      callbackEnd: json.end,
      children: [],
      domain: expect.any(String),
      end: expect.any(Number),
      guid: null,
      method: '',
      nodeId: expect.any(String),
      path: '/json',
      requestBodySize: 0, // cant capture with API,
      requestedWith: 'XMLHttpRequest',
      responseBodySize: expect.any(Number),
      start: expect.any(Number),
      status: expect.any(Number),
      timestamp: null,
      traceId: null,
      type: 'ajax'
    })

    const image = ajaxEvents.request.body.find(x => x.path === '/image') // fetch
    expect(image).toMatchObject({
      callbackDuration: 0, // cant capture with API
      callbackEnd: image.end,
      children: [],
      domain: expect.any(String),
      end: expect.any(Number),
      guid: null,
      method: '',
      nodeId: expect.any(String),
      path: '/image',
      requestBodySize: 0, // cant capture with API,
      requestedWith: 'fetch',
      responseBodySize: expect.any(Number),
      start: expect.any(Number),
      status: expect.any(Number),
      timestamp: null,
      traceId: null,
      type: 'ajax'
    })

    expect(ajaxEvents.request.body.filter(x => x.path === '/json').length).toEqual(1) // only captured once
    expect(ajaxEvents.request.body.filter(x => x.path === '/image').length).toEqual(1) // only captured once
  })
})
