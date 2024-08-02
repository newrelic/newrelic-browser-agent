import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests.js'
import { notSafari, onlyChromium } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('Soft navigations', () => {
  const config = { loader: 'spa', init: { feature_flags: ['soft_nav'] } }
  // test: does not disrupt old spa when not enabled -- this is tested via old spa tests passing by default!

  it('replaces old spa when flag enabled, captures ipl and route-change ixns', async () => {
    let url = await browser.testHandle.assetURL('soft-nav-interaction-on-click.html', config)
    let [iPLPayload] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    let browserResp = await browser.execute(function () {
      return [
        Object.values(newrelic.initializedAgents)[0].features.spa?.featureName,
        Object.values(newrelic.initializedAgents)[0].features.soft_navigations?.featureName
      ]
    })
    expect(browserResp).toEqual([null, 'soft_navigations'])

    expect(iPLPayload.request.body.length).toEqual(1)
    expect(iPLPayload.request.body[0].category).toEqual('Initial page load')

    let [routeChangePayload] = await Promise.all([browser.testHandle.expectInteractionEvents(5000), $('body').click()])
    expect(routeChangePayload.request.body.length).toEqual(1)
    expect(routeChangePayload.request.body[0].category).toEqual('Route change')
  })

  it('does not harvest when spa is blocked by rum response', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: `${JSON.stringify({ st: 1, err: 1, ins: 1, spa: 0, loaded: 1 })}`
    })

    let url = await browser.testHandle.assetURL('instrumented.html', config)
    let anyIxn = browser.testHandle.expectInteractionEvents(10000, true)
    await browser.url(url).then(() => browser.waitForAgentLoad())
    await expect(anyIxn).resolves.toBeUndefined()
  })

  it('(multiple) ajax and errors are captured before page load by iPL ixn', async () => {
    let url = await browser.testHandle.assetURL('ajax-and-errors-before-page-load.html', config)
    let [iPLPayload, jserrorsPayload] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectErrors(),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])
    const iplIxn = iPLPayload.request.body[0]
    const ajaxArr = iplIxn.children
    const errorsArr = jserrorsPayload.request.body.err

    expect(ajaxArr.length).toEqual(2)
    expect(ajaxArr).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/echo', requestedWith: 'XMLHttpRequest' }),
      expect.objectContaining({ path: '/json', requestedWith: 'fetch' })
    ]))
    expect(errorsArr.length).toEqual(2)
    expect(errorsArr[0].params.browserInteractionId).toEqual(iplIxn.id)
    expect(errorsArr[1].params.browserInteractionId).toEqual(iplIxn.id)
  })

  it('(multiple) ajax and errors are captured after page load by route-change ixn', async () => {
    let url = await browser.testHandle.assetURL('soft-nav-interaction-on-click.html', config)
    await browser.url(url).then(() => browser.waitForAgentLoad())

    let [routeChangeReq, jserrorsReq, ajaxReq] = await Promise.all([
      browser.testHandle.expectInteractionEvents(5000),
      browser.testHandle.expectErrors(5000),
      browser.testHandle.expectAjaxEvents(5000),
      $('body').click()
    ])
    expect(routeChangeReq.request.body.length).toEqual(1)
    const rcIxn = routeChangeReq.request.body[0]
    const ixnAjaxArr = rcIxn.children
    const errorsArr = jserrorsReq.request.body.err

    const expectedAjax = expect.arrayContaining([
      expect.objectContaining({ path: '/echo', requestedWith: 'XMLHttpRequest' }),
      expect.objectContaining({ path: '/json', requestedWith: 'fetch' })
    ])
    /* For whatever odd reason, desktop Safari on SauceLabs has a Event's timeStamp that is epoch. That property in actuality on Safari, and other browsers, is correctly
    a DOMHighResTimestamp relative to timeOrigin. It being epoch in tests breaks active interaction seeking logic (and the data itself) as the start time is much larger than
    the end time, so the ajax and jserror becomes disassociated from the interaction. */
    expect(errorsArr.length).toEqual(1)
    if (browserMatch(notSafari)) {
      expect(ixnAjaxArr.length).toEqual(2)
      expect(ixnAjaxArr).toEqual(expectedAjax)
      expect(errorsArr[0].params.browserInteractionId).toEqual(rcIxn.id)
    } else {
      expect(ajaxReq.request.body).toEqual(expectedAjax)
      expect(errorsArr[0].params.browserInteractionId).toBeUndefined()
    }
    expect(errorsArr[0].params.message).toEqual('boogie')
  })

  // See comment in previous test about SL safari's problem with route-change ixn timestamp; we can't simulate one with ajax or errors attached, so this test is irrelevant.
  it.withBrowsersMatching(notSafari)('ajax and jserror tied to discarded ixns are not lost', async () => {
    let url = await browser.testHandle.assetURL('spa/errors/discarded-interaction.html', config)
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await Promise.all([
      browser.testHandle.expectInteractionEvents(5000, true),
      browser.testHandle.expectErrors(5000, true),
      $('body').click() // the fetch and error spawned should be buffered rather than harvested while the ixn is open
    ])

    let [ajaxPayload, jserrorPayload] = await Promise.all([
      browser.testHandle.expectAjaxEvents(5000), // the fetch should now come out of the ajax feature payload, no longer as part of an ixn
      browser.testHandle.expectErrors(5000),
      $('body').click() // this is going to open a new (2nd) ixn & cancel the previous pending ixn, so we expect those buffered events to now flow
    ])
    expect(ajaxPayload.request.body).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/json' })]))
    expect(jserrorPayload.request.body.err[0].params.message).toEqual('some error')
    expect(jserrorPayload.request.body.err[0].params.browserInteractionId).toBeUndefined()

    url = await browser.testHandle.assetURL('/') // test page EoL on the 2nd open ixn that's holding onto events to make sure they get sent too
    const ajaxPayloadPromise = browser.testHandle.expectAjaxEvents(3000)
    const jserrorPayloadPromise = browser.testHandle.expectErrors(3000)
    await browser.pause(100)
    await browser.url(url)
    ;[ajaxPayload, jserrorPayload] = await Promise.all([ajaxPayloadPromise, jserrorPayloadPromise])
    expect(ajaxPayload.request.body).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/json' })]))
    expect(jserrorPayload.request.body.err[0].params.message).toEqual('some error')
    expect(jserrorPayload.request.body.err[0].params.browserInteractionId).toBeUndefined()
  })

  it('createTracer api functions but does not affect interactions', async () => {
    let url = await browser.testHandle.assetURL('instrumented.html', config)
    await browser.url(url).then(() => browser.waitForAgentLoad())

    let [apiIxnPayload, tracerCbTime] = await Promise.all([
      browser.testHandle.expectInteractionEvents(5000),
      browser.execute(function () {
        let wrappedCallback = newrelic.interaction().createTracer('customSegment', function myCallback () { return performance.now() })
        newrelic.interaction().save().end() // tracer doesn't keep interaction open or affect it in any way
        return wrappedCallback() // but the callback should still be perfectly executable
      })
    ])
    const apiIxn = apiIxnPayload.request.body[0]

    expect([apiIxn.trigger, apiIxn.category]).toEqual(['api', 'Custom'])
    expect(apiIxn.end).toBeLessThanOrEqual(tracerCbTime)
  })

  // This reproduction condition only happens for chromium. I.e. safari & firefox load still fires before they let ajax finish.
  // Also, Android 9.0- is not happy with 1mb-dom.html, so that ought to be excluded from this test.
  it.withBrowsersMatching(onlyChromium)('[NR-178375] ajax that finish before page load event should only be in iPL payload', async () => {
    let url = await browser.testHandle.assetURL('64kb-dom-preload-fetch.html', config)
    let [iPLPayload, firstAjaxPayload] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectAjaxEvents(),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])
    const iplIxn = iPLPayload.request.body[0]
    const fetchNode = iplIxn.children.find(ajaxNode => ajaxNode.path === '/json')

    expect(fetchNode).not.toBeUndefined()
    expect(fetchNode.end).toBeLessThan(iplIxn.end) // the request should've wrapped up well before page load event fired
    expect(firstAjaxPayload.request.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ path: '/json' })])) // request should not be recorded by ajax feature as well
  })

  it('[NR-178377] chained ajax requests that originate from pre-page-load are attributed properly', async () => {
    let url = await browser.testHandle.assetURL('chained-ajax-before-load.html', config)
    let [iPLPayload, firstAjaxPayload] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectAjaxEvents(),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])
    const iplIxnAjaxArr = iPLPayload.request.body[0].children
    const ajaxFeatArr = firstAjaxPayload.request.body

    expect(iplIxnAjaxArr).toEqual(expect.arrayContaining([ // these requests started before page load, so they belong with IPL ixn
      expect.objectContaining({ path: '/json', requestedWith: 'XMLHttpRequest' }),
      expect.objectContaining({ path: '/json', requestedWith: 'fetch' })
    ]))
    expect(ajaxFeatArr).toEqual(expect.arrayContaining([ // these chained requests occur after page load, so they're handled by the ajax feature
      expect.objectContaining({ path: '/text', requestedWith: 'XMLHttpRequest' }),
      expect.objectContaining({ path: '/text', requestedWith: 'fetch' })
    ]))
  })
})
