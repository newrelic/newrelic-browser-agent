import { checkRum } from '../../util/basic-checks'
import { testAssetRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('basic pve capturing', () => {
  ['same-origin', 'cross-origin'].forEach(page => {
    it(`should send rum when ${page} page loads in an iframe`, async () => {
      const [
        rumResults
      ] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL(`iframe/${page}.html`))
      ])

      checkRum(rumResults.request)
    })
  })

  it('should capture page load timings', async () => {
    await browser.testHandle.scheduleReply('assetServer', {
      test: testAssetRequest,
      permanent: true,
      delay: 500
    })

    const [
      rumResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html'))
    ])

    checkRum(rumResults.request)
    expect(parseInt(rumResults.request.query.be, 10)).toBeGreaterThanOrEqual(500)
    expect(parseInt(rumResults.request.query.fe, 10)).toBeGreaterThanOrEqual(100)
    expect(parseInt(rumResults.request.query.dc, 10)).toBeGreaterThanOrEqual(100)
  })
})
