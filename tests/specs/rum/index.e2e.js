import { checkRumBody, checkRumPerf, checkRumQuery } from '../../util/basic-checks'
import { testAssetRequest } from '../../../tools/testing-server/utils/expect-tests'
import { detailedCheckRum } from '../../util/detailed-checks'
import { supportsFirstContentfulPaint, supportsFirstPaint } from '../../../tools/browser-matcher/common-matchers.mjs'

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
  ['same-origin', 'cross-origin'].forEach(page => {
    it(`should send rum when ${page} page loads in an iframe`, async () => {
      const [
        rumResults
      ] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL(`iframe/${page}.html`))
      ])

      checkRumQuery(rumResults.request)
      checkRumBody(rumResults.request)
    })
  })

  it('should capture page load timings', async () => {
    await browser.testHandle.scheduleReply('assetServer', {
      test: testAssetRequest,
      permanent: false,
      delay: 500
    })

    const [
      rumResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html'))
    ])

    checkRumQuery(rumResults.request)
    checkRumBody(rumResults.request)
    expect(parseInt(rumResults.request.query.be, 10)).toBeGreaterThanOrEqual(500)
    expect(parseInt(rumResults.request.query.fe, 10)).toBeGreaterThanOrEqual(100)
    expect(parseInt(rumResults.request.query.dc, 10)).toBeGreaterThanOrEqual(100)
  })

  /** equivalent to former no-body.test.js */
  it('reports RUM with no body', async () => {
    const [
      rumResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('no-body.html', { config: { account: loader_config.account } }))
    ])

    checkRumQuery(rumResults.request)
    detailedCheckRum(rumResults.request, { query: { ac: 'test_account' }, body: { ja: { no: 'body' } } })
  })

  /** equivalent to former paint-timing.test.js */
  it.withBrowsersMatching([supportsFirstPaint, supportsFirstContentfulPaint])('reports paint timings', async () => {
    const [
      rumResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { config: { account: loader_config.account } }))
    ])

    expect(Number(rumResults.request.query.fp)).toBeGreaterThan(0)
    expect(Number(rumResults.request.query.fcp)).toBeGreaterThan(0)
  })

  /** equivalent to former unconfigured-on-load.test.js */
  it('should not receive RUM call if not configured', async () => {
    await Promise.all([
      browser.testHandle.expectRum(10000, true),
      browser.url(await browser.testHandle.assetURL('unconfigured-on-load.html'))
    ])
  })
})

describe('APM Decorations', () => {
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
    const [
      rumResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('rum-data.html', { config: loader_config }))
    ])
    detailedCheckRum(rumResults.request, expected) // equivalent to former data.test.js
    checkRumPerf(rumResults.request) // equivalent to former nav-timing.test.js, former perf.test.js
    expect(+rumResults.request.query.dc).toBeGreaterThanOrEqual(0)
    expect(+rumResults.request.query.fe).toBeGreaterThanOrEqual(+rumResults.request.query.dc)
  })

  /** equivalent to former transaction-name.test.js */
  it('should report a transactionName without a tNamePlain', async () => {
    const [
      rumResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { config: { transactionName: 'abc' } }))
    ])

    expect(rumResults.request.query.to).toEqual('abc') // has correct obfuscated transactionName
    expect(rumResults.request.query.t).toBeUndefined() // tNamePlain excluded
  })

  /** equivalent to former transaction-name.test.js */
  it('should report a tNamePlain without a transactionName', async () => {
    const [
      rumResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { config: { tNamePlain: 'abc' } }))
    ])

    expect(rumResults.request.query.t).toEqual('abc') // has correct tNamePlain
    expect(rumResults.request.query.to).toBeUndefined() // transactionName excluded
  })

  /** equivalent to former transaction-name.test.js */
  it('should honor transactionName if both tNamePlain and transactionName are supplied', async () => {
    const [
      rumResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { config: { transactionName: 'abc', tNamePlain: 'def' } }))
    ])

    expect(rumResults.request.query.to).toEqual('abc') // should honor obfuscated if both are defined
    expect(rumResults.request.query.t).toBeUndefined() // tNamePlain excluded
  })
})
