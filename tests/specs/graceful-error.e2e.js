describe('graceful error', () => {
  it('agent either runs or fails gracefully', async () => {
    await browser.url(await browser.testHandle.assetURL('graceful-error.html'))
    await browser.pause(1000)

    const results = JSON.parse(await browser.execute(function () {
      return JSON.stringify({
        errorSeen: window.errorSeen,
        someOutput: window.someOutput
      })
    }))
    expect(results.someOutput).toEqual(true)
    expect(results.errorSeen).toEqual(false)
  })
})
