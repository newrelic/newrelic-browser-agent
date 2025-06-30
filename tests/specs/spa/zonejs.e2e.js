import { notIOS } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('spa interactions with zonejs', () => {
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  it('should capture spa interactions with zonejs present', async () => {
    const url = await browser.testHandle.assetURL('spa/zonejs.html')
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      await browser.url(url).then(() => browser.waitForAgentLoad()),
      // Perform click after the initial page load interaction is captured
      interactionsCapture.waitForResult({ totalCount: 1 })
        .then(() => $('body').click())
    ])

    const referrer = await browser.execute(() => document.referrer || null)

    expect(interactionHarvests[0].request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        initialPageURL: url.slice(0, url.indexOf('?')),
        newURL: url.slice(0, url.indexOf('?')),
        oldURL: referrer
      })
    ]))

    expect(interactionHarvests[1].request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        initialPageURL: url.slice(0, url.indexOf('?')),
        newURL: expect.stringMatching(new RegExp(url.slice(0, url.indexOf('?')) + '#[\\d\\.]*$')),
        oldURL: url.slice(0, url.indexOf('?'))
      })
    ]))
  })

  it('should only call onreadystatechange once with zonejs present', async () => {
    const url = await browser.testHandle.assetURL('spa/zonejs-on-ready-state-change.html')
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const referrer = await browser.execute(() => document.referrer || null)

    const event = interactionHarvests[0].request.body
      .find(ev => ev.type === 'interaction' && ev.trigger === 'initialPageLoad')
    expect(event).toEqual(expect.objectContaining({
      category: 'Initial page load',
      type: 'interaction',
      trigger: 'initialPageLoad',
      initialPageURL: url.slice(0, url.indexOf('?')),
      newURL: url.slice(0, url.indexOf('?')),
      ...(browserMatch(notIOS) ? { oldURL: referrer } : {}), // ios on lambdatest appears to return the wrong value for referrer when using browser.execute, which breaks this test condition. Confirmed referrer behavior works in real env
      children: expect.arrayContaining([
        expect.objectContaining({
          domain: expect.stringContaining('bam-test-1.nr-local.net'),
          method: 'GET',
          path: '/json',
          requestedWith: 'XMLHttpRequest',
          status: 200,
          type: 'ajax'
        })
      ])
    }))

    // the counts custom attribute is an array of the number of times onreadystatechage is called
    // for each state.  state 1 and 3 may be called more than once, 2 and 4 should be called
    // exactly once
    const counts = JSON.parse(
      event.children
        .find(ev => ev.type === 'stringAttribute' && ev.key === 'counts')
        .value
    )
    expect(counts[1]).toBeGreaterThanOrEqual(1)
    expect(counts[2]).toEqual(1)
    expect(counts[3]).toBeGreaterThanOrEqual(1)
    expect(counts[4]).toEqual(1)
  })
})
