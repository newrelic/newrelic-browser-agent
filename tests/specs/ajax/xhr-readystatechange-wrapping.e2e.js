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

    expect(readyStatesSeen).toEqual(expect.arrayContaining([
      [1, expect.stringContaining('nr@original')],
      [2, expect.stringContaining('nr@original')],
      [3, expect.stringContaining('nr@original')],
      [4, expect.stringContaining('nr@original')]
    ]))
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

    expect(readyStatesSeen).toEqual(expect.arrayContaining([
      [2, expect.stringContaining('nr@original')],
      [3, expect.stringContaining('nr@original')],
      [4, expect.stringContaining('nr@original')]
    ]))
  })
})
