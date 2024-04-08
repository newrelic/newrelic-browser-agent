describe('XHR onreadystatechange wrapping', () => {
  it('properly wraps onreadystatechange function added before send call', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-readystate-before-send.html'))
      .then(() => browser.waitForAgentLoad())

    await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.execute(function () {
        // We don't want the spa feature to pick up the ajax call
        window.disableAjaxHashChange = true
      }).then(() => $('#sendAjax').click())
    ])

    const readyStatesSeen = await browser.execute(function () {
      return window.readyStatesSeen
    })

    expect(readyStatesSeen).toEqual([
      [1, 'nrWrapper'],
      [2, 'nrWrapper'],
      [3, 'nrWrapper'],
      [4, 'nrWrapper']
    ])
  })

  it('properly wraps onreadystatechange function added after send call', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-readystate-after-send.html'))
      .then(() => browser.waitForAgentLoad())

    await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.execute(function () {
        // We don't want the spa feature to pick up the ajax call
        window.disableAjaxHashChange = true
      }).then(() => $('#sendAjax').click())
    ])

    const readyStatesSeen = await browser.execute(function () {
      return window.readyStatesSeen
    })

    expect(readyStatesSeen).toEqual([
      [2, 'nrWrapper'],
      [3, 'nrWrapper'],
      [4, 'nrWrapper']
    ])
  })
})
