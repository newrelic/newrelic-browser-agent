import { JSONPath } from 'jsonpath-plus'
import { testAjaxEventsRequest, testErrorsRequest, testInteractionEventsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests.js'
import { notSafari, onlyChromium } from '../../../tools/browser-matcher/common-matchers.mjs'
import { rumFlags } from '../../../tools/testing-server/constants.js'

// test: does not disrupt old spa when not enabled -- this is tested via old spa tests passing by default!
describe('Soft navigations', () => {
  const config = { loader: 'spa', init: { feature_flags: ['soft_nav'] } }
  let interactionsCapture, errorsCapture, ajaxEventsCapture

  beforeEach(async () => {
    [interactionsCapture, errorsCapture, ajaxEventsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInteractionEventsRequest },
      { test: testErrorsRequest },
      { test: testAjaxEventsRequest }
    ])
  })

  it('replaces old spa when flag enabled, captures ipl and route-change ixns', async () => {
    let [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/soft-nav-interaction-on-click.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    const browserResp = await browser.execute(function () {
      return [
        Object.values(newrelic.initializedAgents)[0].features.spa?.featureName,
        Object.values(newrelic.initializedAgents)[0].features.soft_navigations?.featureName
      ]
    })
    expect(browserResp).toEqual([null, 'soft_navigations'])

    expect(interactionHarvests[0].request.body.length).toEqual(1)
    expect(interactionHarvests[0].request.body[0].category).toEqual('Initial page load')

    ;[interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      $('body').click()]
    )
    expect(interactionHarvests[1].request.body.length).toEqual(1)
    expect(interactionHarvests[1].request.body[0].category).toEqual('Route change')
  })

  it('does not harvest when spa is blocked by rum response', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ spa: 0 }))
    })

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/soft-nav-interaction-on-click.html', config))
        .then(() => browser.waitForAgentLoad())
        .then(() => $('body').click())
    ])

    expect(interactionHarvests.length).toEqual(0)
  })

  it('(multiple) ajax and errors are captured before page load by iPL ixn', async () => {
    const [interactionHarvests, errorsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('ajax-and-errors-before-page-load.html', config))
        .then(() => browser.waitForAgentLoad())
    ])
    const iplIxn = interactionHarvests[0].request.body[0]
    const ajaxArr = iplIxn.children
    const errorsArr = errorsHarvests[0].request.body.err

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
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/soft-nav-interaction-on-click.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionHarvests, errorsHarvests, ajaxEventsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      errorsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ timeout: 5000 }), // needed for Safari case wherein /echo and /json are in 1st ajax payload
      $('body').click()
    ])

    expect(interactionHarvests[1].request.body.length).toEqual(1)
    const rcIxn = interactionHarvests[1].request.body[0]
    const ixnAjaxArr = rcIxn.children
    const errorsArr = errorsHarvests[0].request.body.err

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
      expect(ajaxEventsHarvests[0].request.body).toEqual(expectedAjax)
      expect(errorsArr[0].params.browserInteractionId).toBeUndefined()
    }
    expect(errorsArr[0].params.message).toEqual('boogie')
  })

  // See comment in previous test about SL safari's problem with route-change ixn timestamp; we can't simulate one with ajax or errors attached, so this test is irrelevant.
  it.withBrowsersMatching(notSafari)('ajax and jserror tied to discarded ixns are not lost', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/errors/discarded-interaction.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    await Promise.all([
      interactionsCapture.waitForResult({ timeout: 5000 }),
      errorsCapture.waitForResult({ timeout: 5000 }),
      $('body').click() // the fetch and error spawned should be buffered rather than harvested while the ixn is open
    ])

    let [errorsHarvests, ajaxEventsHarvests] = await Promise.all([
      errorsCapture.waitForResult({ timeout: 5000 }),
      ajaxEventsCapture.waitForResult({ timeout: 5000 }), // the fetch should now come out of the ajax feature payload, no longer as part of an ixn
      $('body').click() // this is going to open a new (2nd) ixn & cancel the previous pending ixn, so we expect those buffered events to now flow
    ])

    let jsonXHR = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: ajaxEventsHarvests })
    expect(jsonXHR.length).toEqual(1)

    let errors = JSONPath({ path: '$.[*].request.body.err.[?(!!@ && @.params && @.params.message && @.params.message===\'some error\')]', json: errorsHarvests })
    expect(errors.length).toEqual(1)
    expect(errors[0].params.browserInteractionId).toBeUndefined()

    ;[errorsHarvests, ajaxEventsHarvests] = await Promise.all([
      errorsCapture.waitForResult({ timeout: 5000 }),
      ajaxEventsCapture.waitForResult({ timeout: 5000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    jsonXHR = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path && @.path===\'/json\')]', json: ajaxEventsHarvests })
    expect(jsonXHR.length).toEqual(2)

    errors = JSONPath({ path: '$.[*].request.body.err.[?(!!@ && @.params && @.params.message && @.params.message===\'some error\')]', json: errorsHarvests })
    expect(errors.length).toEqual(2)
    expect(errors[1].params.browserInteractionId).toBeUndefined()
  })

  it('createTracer api functions but does not affect interactions', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    let [interactionHarvests, tracerCbTime] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        let wrappedCallback = newrelic.interaction().createTracer('customSegment', function myCallback () { return performance.now() })
        newrelic.interaction().save().end() // tracer doesn't keep interaction open or affect it in any way
        return wrappedCallback() // but the callback should still be perfectly executable
      })
    ])

    const apiIxn = interactionHarvests[1].request.body[0]
    expect([apiIxn.trigger, apiIxn.category]).toEqual(['api', 'Custom'])
    expect(apiIxn.end).toBeLessThanOrEqual(tracerCbTime)
  })

  // This reproduction condition only happens for chromium. I.e. safari & firefox load still fires before they let ajax finish.
  // Also, Android 9.0- is not happy with 1mb-dom.html, so that ought to be excluded from this test.
  it.withBrowsersMatching(onlyChromium)('[NR-178375] ajax that finish before page load event should only be in iPL payload', async () => {
    const [interactionHarvests, ajaxEventsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('64kb-dom-preload-fetch.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    const iplAjax = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: interactionHarvests })
    const ajaxEvents = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: ajaxEventsHarvests })
    expect(iplAjax.length).toEqual(1)
    expect(ajaxEvents.length).toEqual(0) // request should not be recorded by ajax feature as well
    expect(iplAjax[0].end).toBeLessThan(interactionHarvests[0].request.body[0].end) // the request should've wrapped up well before page load event fired
  })

  it('[NR-178377] chained ajax requests that originate from pre-page-load are attributed properly', async () => {
    /**
     * Requests that start before page load and finish before page load should be captured in the IPL ixn payload
     * Requests that start before page load and finish after page load should be captured in the AJAX payload
     * Requests that start after page load and finish after page load should be captured in the AJAX payload
     */
    let [interactionHarvests, ajaxEventsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('chained-ajax-before-load.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: interactionHarvests })
    ).toEqual(expect.arrayContaining([ // these requests started before page load, so they belong with IPL ixn
      expect.objectContaining({ path: '/json', requestedWith: 'XMLHttpRequest' }),
      expect.objectContaining({ path: '/json', requestedWith: 'fetch' })
    ]))
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/text\')]', json: ajaxEventsHarvests })
    ).toEqual(expect.arrayContaining([ // these requests started before page load, so they belong with IPL ixn
      expect.objectContaining({ path: '/text', requestedWith: 'XMLHttpRequest' }),
      expect.objectContaining({ path: '/text', requestedWith: 'fetch' })
    ]))
  })

  it('multiple finished ixns retain the correct start/end timestamps and sequence in payload', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/sequential-api.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    let interactionHarvests = await interactionsCapture.waitForResult({ totalCount: 2 })

    let sequentialMet = true
    const body = interactionHarvests[1].request.body
    body.forEach((ixn, i) => {
      if (ixn.start > ixn.end) sequentialMet = false
      if (ixn.end > (body[i + 1]?.start || Infinity)) sequentialMet = false
      if (ixn.nodeId > (body[i + 1]?.nodeId || Infinity)) sequentialMet = false
    })

    expect(interactionHarvests[1].request.body.map(ixn => ([ixn.trigger, ixn.customName]))).toEqual([
      ['api', 'some_id'],
      ['api', 'some_other_id'],
      ['api', 'some_another_id']
    ])

    expect(sequentialMet).toEqual(true)
  })
})
