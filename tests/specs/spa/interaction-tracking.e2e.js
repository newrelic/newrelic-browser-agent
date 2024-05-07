import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('interaction tracking works inside', () => {
  it.withBrowsersMatching(notIE)('single fetch with formData', async () => {
    const url = await browser.testHandle.assetURL('spa/fetch-formdata-onclick.html')
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
})
