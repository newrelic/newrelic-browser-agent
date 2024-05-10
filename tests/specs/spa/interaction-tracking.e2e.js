import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('interaction tracking', () => {
  it.withBrowsersMatching(notIE)('works with Request formData', async () => {
    const url = await browser.testHandle.assetURL('spa/requestobj-formdata.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [clickInteractionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      $('body').click()
    ])

    expect(clickInteractionResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Custom',
        type: 'interaction',
        trigger: 'click',
        children: [
          expect.objectContaining({
            type: 'customTracer',
            name: 'timer',
            children: []
          })
        ]
      })
    ]))
  })

  it.withBrowsersMatching(notIE)('works with Request object data methods', async () => {
    const url = await browser.testHandle.assetURL('spa/requestobj-methods.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [clickInteractionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      $('body').click()
    ])

    const childrenArr = clickInteractionResults.request.body[0].children
    expect(childrenArr.length).toEqual(4)
    childrenArr.forEach(node => expect(node).toEqual(expect.objectContaining({
      type: 'customTracer',
      name: 'timer',
      children: []
    })))
  })

  it.withBrowsersMatching(notIE)('works with fetch Response object data methods', async () => {
    const url = await browser.testHandle.assetURL('spa/fetch-responseobj-methods.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [clickInteractionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      $('body').click()
    ])

    const ajaxNodesArr = clickInteractionResults.request.body[0].children
    expect(ajaxNodesArr.length).toEqual(4)
    ajaxNodesArr.forEach(ajax => expect(ajax).toEqual(expect.objectContaining({
      path: '/json',
      requestedWith: 'fetch',
      children: [expect.objectContaining({
        type: 'customTracer',
        name: 'timer',
        children: []
      })]
    })))
  })

  it('correctly tracks create tracer interactions inside XHR ready state change', async () => {
    await browser.url(
      await browser.testHandle.assetURL('spa/api-tracers-xhr-readyStateChange.html')
    ).then(() => browser.waitForAgentLoad())

    const [clickInteractionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      $('body').click()
    ])

    expect(clickInteractionResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Custom',
        type: 'interaction',
        trigger: 'click',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            path: '/echo',
            requestedWith: 'XMLHttpRequest',
            children: expect.arrayContaining([
              expect.objectContaining({
                type: 'customTracer',
                name: 'timerA'
              }),
              expect.objectContaining({
                type: 'customTracer',
                name: 'timerB'
              })
            ])
          })
        ])
      })
    ]))
  })

  it('should not create an interaction for an xhr that never sends', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000, true),
      browser.execute(function () {
        var interaction = newrelic.interaction().setName('foobar')
        var xhr = new XMLHttpRequest()

        xhr.addEventListener('readystatechange', function () {
          if (xhr.readyState !== 2) return
          setTimeout(interaction.createTracer('timerA', function () {}))
        })
        xhr.addEventListener('loadend', function () {
          interaction.save().end()
        })
        xhr.open('POST', '/echo')
      })
    ])

    expect(interactionResults).toBeUndefined()
  })

  it('should not create an interaction node for an xhr that never sends', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      browser.execute(function () {
        var interaction = newrelic.interaction().setName('foobar')
        var xhr = new XMLHttpRequest()

        xhr.open('POST', '/echo')

        setTimeout(interaction.createTracer('timerA', function () {
          interaction.save().end()
        }), 2000)
      })
    ])

    expect(interactionResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Custom',
        type: 'interaction',
        customName: 'foobar',
        trigger: 'api',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'customTracer',
            name: 'timerA'
          })
        ])
      })
    ]))
  })
})
