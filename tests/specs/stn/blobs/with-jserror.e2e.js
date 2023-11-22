import { stConfig } from '../../util/helpers'

describe('Trace with JS error feature', () => {
  it('gets error too', async () => {
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await Promise.all([browser.testHandle.expectTrace(), browser.execute(function () {
      newrelic.noticeError('hello session traces i am error')
    })]).then(([{ request: { body } }]) => {
      let err = body.find(node => node.n === 'error')
      expect(err).not.toBeUndefined()
      expect(err.o).toEqual('hello session traces i am error')
    })
  })
})
