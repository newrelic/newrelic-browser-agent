describe('circular references', () => {
  it('are encoded properly when error message contains a circular reference', async () => {
    const [errorsResults] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.url(await browser.testHandle.assetURL('circular.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errorsResults.request.body.err.length).toBe(1) // exactly one error
    expect(errorsResults.request.body.err[0].params.message).toBe('[object Object]')
  })
})
