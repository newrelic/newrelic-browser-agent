import { checkRumBody, checkRumPerf, checkRumQuery } from '../../util/basic-checks'
import { testAssetRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { detailedCheckRum } from '../../util/detailed-checks'
import { supportsFirstPaint } from '../../../tools/browser-matcher/common-matchers.mjs'

const loader_config = {
  applicationTime: 382,
  queueTime: 837,
  account: 'test_account',
  user: 'test_user',
  product: 'test_product',
  ttGuid: '21EC2020-3AEA-1069-A2DD-08002B30309D',
  applicationID: 'test_app_id',
  extra: 'test_extra',
  atts: 'test_atts',
  userAttributes: 'test_userAttributes'
}

describe('basic pve capturing', () => {
  let rumCapture

  beforeEach(async () => {
    rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
  })

  ;['same-origin', 'cross-origin'].forEach(page => {
    it(`should send rum when ${page} page loads in an iframe`, async () => {
      const [[rumHarvest]] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL(`iframe/${page}.html`))
      ])

      checkRumQuery(rumHarvest.request)
      checkRumBody(rumHarvest.request)
    })
  })

  it('should capture page load timings', async () => {
    await browser.testHandle.scheduleReply('assetServer', {
      test: testAssetRequest,
      permanent: false,
      delay: 500
    })

    const [[rumHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html'))
    ])

    checkRumQuery(rumHarvest.request)
    checkRumBody(rumHarvest.request)
    expect(parseInt(rumHarvest.request.query.be, 10)).toBeGreaterThanOrEqual(500)
    expect(parseInt(rumHarvest.request.query.fe, 10)).toBeGreaterThanOrEqual(100)
    expect(parseInt(rumHarvest.request.query.dc, 10)).toBeGreaterThanOrEqual(100)
  })

  /** equivalent to former no-body.test.js */
  it('reports RUM with no body', async () => {
    const [[rumHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('no-body.html', { config: { account: loader_config.account } }))
    ])

    checkRumQuery(rumHarvest.request)
    detailedCheckRum(rumHarvest.request, { query: { ac: 'test_account' }, body: { ja: { no: 'body' } } })
  })

  /** equivalent to former paint-timing.test.js */
  it.withBrowsersMatching(supportsFirstPaint)('reports paint timings', async () => {
    const [[rumHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { config: { account: loader_config.account } }))
    ])

    expect(Number(rumHarvest.request.query.fp)).toBeGreaterThan(0)
    expect(Number(rumHarvest.request.query.fcp)).toBeGreaterThan(0)
  })

  /** equivalent to former unconfigured-on-load.test.js */
  it('should not receive RUM call if not configured', async () => {
    const [rumHarvests] = await Promise.all([
      rumCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('unconfigured-on-load.html'))
    ])

    expect(rumHarvests.length).toEqual(0)
  })

  // equivalent to former data.test.js
  it('should capture detailed APM decorations', async () => {
    const expected = {
      query: {
        ap: String(loader_config.applicationTime),
        qt: String(loader_config.queueTime),
        ac: String(loader_config.account),
        us: String(loader_config.user),
        pr: String(loader_config.product),
        tt: String(loader_config.ttGuid),
        a: String(loader_config.applicationID),
        xx: String(loader_config.extra),
        ua: String(loader_config.userAttributes),
        at: String(loader_config.atts)
      },
      body: { ja: { foo: 'bar' } }
    }

    const [[rumHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rum-data.html', { config: loader_config }))
    ])

    detailedCheckRum(rumHarvest.request, expected) // equivalent to former data.test.js
    checkRumPerf(rumHarvest.request) // equivalent to former nav-timing.test.js, former perf.test.js
    expect(+rumHarvest.request.query.dc).toBeGreaterThanOrEqual(0)
    expect(+rumHarvest.request.query.fe).toBeGreaterThanOrEqual(+rumHarvest.request.query.dc)
  })

  /** equivalent to former transaction-name.test.js */
  it('should report a transactionName without a tNamePlain', async () => {
    const [[rumHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { config: { transactionName: 'abc' } }))
    ])

    expect(rumHarvest.request.query.to).toEqual('abc') // has correct obfuscated transactionName
    expect(rumHarvest.request.query.t).toBeUndefined() // tNamePlain excluded
  })

  /** equivalent to former transaction-name.test.js */
  it('should report a tNamePlain without a transactionName', async () => {
    const [[rumHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { config: { tNamePlain: 'abc' } }))
    ])

    expect(rumHarvest.request.query.t).toEqual('abc') // has correct tNamePlain
    expect(rumHarvest.request.query.to).toBeUndefined() // transactionName excluded
  })

  /** equivalent to former transaction-name.test.js */
  it('should honor transactionName if both tNamePlain and transactionName are supplied', async () => {
    const [[rumHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { config: { transactionName: 'abc', tNamePlain: 'def' } }))
    ])

    expect(rumHarvest.request.query.to).toEqual('abc') // should honor obfuscated if both are defined
    expect(rumHarvest.request.query.t).toBeUndefined() // tNamePlain excluded
  })
})
