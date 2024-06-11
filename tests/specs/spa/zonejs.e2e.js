const { browserClick } = require('../util/helpers')

describe('spa interactions with zonejs', () => {
  it('should capture spa interactions with zonejs present', async () => {
    const url = await browser.testHandle.assetURL('spa/zonejs.html')
    const [initialPageLoadInteractionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(initialPageLoadInteractionResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        initialPageURL: url.slice(0, url.indexOf('?')),
        newURL: url.slice(0, url.indexOf('?')),
        oldURL: url.slice(0, url.indexOf('?'))
      })
    ]))

    const [clickInteractionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browserClick('body')
    ])

    expect(clickInteractionResults.request.body).toEqual(expect.arrayContaining([
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
    const [interactionEvents] = await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    const event = interactionEvents.request.body
      .find(ev => ev.type === 'interaction' && ev.trigger === 'initialPageLoad')
    expect(event).toEqual(expect.objectContaining({
      category: 'Initial page load',
      type: 'interaction',
      trigger: 'initialPageLoad',
      initialPageURL: url.slice(0, url.indexOf('?')),
      newURL: url.slice(0, url.indexOf('?')),
      oldURL: url.slice(0, url.indexOf('?')),
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
