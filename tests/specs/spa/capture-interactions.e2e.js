describe('spa captures interaction when', () => {
  it('hashchange fires after finish', async () => {
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
})
