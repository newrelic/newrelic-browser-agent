import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('interaction tracking works inside', () => {
  it.withBrowsersMatching(notIE)('single fetch with formData', async () => {
    const url = await browser.testHandle.assetURL('spa/fetch-formdata-onclick.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [clickInteractionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(7000),
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
})
