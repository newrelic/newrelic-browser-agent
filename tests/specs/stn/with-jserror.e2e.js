describe('Trace with JS error feature', () => {
  it('gets error too', async () => {
    let url = await browser.testHandle.assetURL('instrumented.html')
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await Promise.all([browser.testHandle.expectResources(), browser.execute(function () {
      newrelic.noticeError('hello session traces i am error')
    })]).then(([{ request: { body } }]) => {
      let err = body.res.find(node => node.n === 'error')
      expect(err).not.toBeUndefined()
      expect(err.o).toEqual('hello session traces i am error')
    })
  })

  it('does not sent duplicate nodes', async () => {
    let url = await browser.testHandle.assetURL('instrumented.html')
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await Promise.all([browser.testHandle.expectResources(), browser.execute(function () {
      newrelic.noticeError('hello session traces i am error')
    })]).then(([{ request: { body } }]) => {
      const errs = body.res.filter(node => node.n === 'error' && node.o === 'hello session traces i am error')
      expect(errs.length).toEqual(1)
    })
  })
})
