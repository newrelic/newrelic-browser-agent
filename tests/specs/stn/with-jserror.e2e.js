describe('Trace with JS error feature', () => {
  it('gets error too', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', { init: { session_trace: { harvestTimeSeconds: 5 } } })
    await browser.url(url).then(() => browser.waitForAgentLoad())
    // await Promise.all([browser.testHandle.expectResources(), browser.url(url).then(() => browser.waitForAgentLoad())])

    await Promise.all([browser.testHandle.expectResources(), browser.execute(function () {
      newrelic.noticeError('hello session traces i am error')
    })]).then(([{ request: { body } }]) => {
      const err = body.res.find(node => node.n === 'error')
      expect(err).not.toBeUndefined()
      expect(err.o).toEqual('hello session traces i am error')
    })
  })
})
