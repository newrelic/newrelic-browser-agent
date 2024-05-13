describe('spa captures interaction when', () => {
  it('hashchange fires after XHR loads', async () => {
    const url = await browser.testHandle.assetURL('spa/hashchange-onclick.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [clickInteractionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      $('body').click()
    ])

    expect(clickInteractionResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        initialPageURL: url.slice(0, url.indexOf('?')),
        oldURL: url.slice(0, url.indexOf('?')),
        newURL: expect.stringMatching(new RegExp(url.slice(0, url.indexOf('?')) + '#[\\d\\.]*$')),
        children: expect.arrayContaining([
          {
            key: 'after-hashchange',
            type: 'trueAttribute'
          }
        ])
      })
    ]))
  })

  it('pushstate is followed by a popstate', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [popstateIxnPayload] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.execute(function () {
        window.history.pushState({}, '', '/newurl')
        window.addEventListener('popstate', function () { setTimeout(newrelic.interaction().createTracer('timer')) })
        window.history.back()
      })
    ])

    const parsedUrl = new URL(url)
    expect(popstateIxnPayload.request.body[0]).toEqual(expect.objectContaining({
      category: 'Route change',
      type: 'interaction',
      trigger: 'popstate',
      oldURL: parsedUrl.origin + '/newurl',
      newURL: parsedUrl.origin + parsedUrl.pathname, // should be the original asset url
      children: [
        expect.objectContaining({
          type: 'customTracer',
          name: 'timer',
          children: []
        })
      ]
    }))
  })

  it('hashchange is followed by a popstate', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])
    const hashFragment = 'otherurl'
    await Promise.all([
      browser.testHandle.expectInteractionEvents(), // discard first hashchange interaction
      browser.execute(function (hashFragment) {
        window.location.hash = hashFragment
      }, hashFragment)
    ])

    const [popstateIxnPayload] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.execute(function () {
        window.addEventListener('popstate', function () { setTimeout(newrelic.interaction().createTracer('onPopstate')) })
        window.history.back()
      })
    ])

    const parsedUrl = new URL(url)
    expect(popstateIxnPayload.request.body[0]).toEqual(expect.objectContaining({
      category: 'Route change',
      type: 'interaction',
      trigger: 'popstate',
      oldURL: parsedUrl.origin + parsedUrl.pathname + '#' + hashFragment,
      newURL: parsedUrl.origin + parsedUrl.pathname, // should be the original asset url
      children: [
        expect.objectContaining({
          type: 'customTracer',
          name: 'onPopstate',
          children: []
        })
      ]
    }))
  })
})
