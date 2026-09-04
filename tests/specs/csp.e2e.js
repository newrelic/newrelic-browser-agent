import { faker } from '@faker-js/faker'
import { testInsRequest, testSupportMetricsRequest } from '../../tools/testing-server/utils/expect-tests'
import { onlyChromium } from '../../tools/browser-matcher/common-matchers.mjs'

describe('Content Security Policy', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should support a nonce script element', async () => {
    const nonce = faker.string.uuid()
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { nonce }))
      .then(() => browser.waitForAgentLoad())

    const foundNonces = await browser.execute(function () {
      var scriptTags = document.querySelectorAll('script')
      var nonceValues = []
      for (let i = 0; i < scriptTags.length; i++) {
        nonceValues.push(scriptTags[i].nonce)
      }
      return nonceValues
    })

    expect(foundNonces.length).toBeGreaterThanOrEqual(1)
    foundNonces.forEach(foundNonce => {
      expect(foundNonce).toEqual(nonce)
    })
  })

  it('should send a nonce supportability metric', async () => {
    const supportMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
      test: testSupportMetricsRequest
    })
    const nonce = faker.string.uuid()
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { nonce }))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      supportMetricsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults[0].request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Runtime/Nonce/Detected' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
  })

  it('should load async chunk with subresource integrity', async () => {
    await browser.enableSessionReplay()

    await browser.url(await browser.testHandle.assetURL('subresource-integrity-capture.html', {
      init: {
        privacy: { cookies_enabled: true },
        session_replay: { enabled: true }
      }
    })).then(() => browser.waitForAgentLoad())

    await browser.waitUntil(
      () => browser.execute(function () {
        return window.chunkIntegrityValues.length === 3
      })
    )
    const foundIntegrityValues = await browser.execute(function () {
      return window.chunkIntegrityValues
    })

    foundIntegrityValues.forEach(hash =>
      expect(hash).toMatch(/^sha512-[a-zA-Z0-9=/+]+$/)
    )
  })

  /**
   * SecurityPolicyViolation is reported via two mechanisms (see NR-610205):
   *  - the securitypolicyviolation listener, which works reliably on every browser but can only catch violations
   *    that occur after the (asynchronously loaded) agent has attached it
   *  - a ReportingObserver on the `csp-violation` type with `buffered: true`, used only to replay the pre-attach
   *    backlog once, then disconnected
   * csp-violation.html triggers one violation before the agent loader runs (pre-injection) and one after
   * (post-injection) to exercise both paths. The pre-injection one is only asserted on Chromium because
   * ReportingObserver's csp-violation delivery isn't reliable elsewhere out of the box:
   *  - https://bugs.webkit.org/show_bug.cgi?id=320750 -- Safari/WebKit never delivers csp-violation reports unless
   *    the page's CSP sets a `report-to` directive (which CSP via a `<meta>` tag can't even do, and which almost no
   *    real-world site configures), so Safari gets nothing for the common case.
   *  - https://bugs.webkit.org/show_bug.cgi?id=315730 -- when WebKit does deliver, it fires duplicate csp-violation
   *    reports for the same violation, ~50-60ms apart.
   *  - Firefox ships ReportingObserver/csp-violation behind the `dom.reporting.enabled` pref, which defaults to
   *    false (confirmed in mozilla-central's StaticPrefList.yaml), so it's off out of the box.
   * All three were still true as of 2026-09-04. The post-injection violation is asserted on every browser, since it
   * only depends on the universally-reliable securitypolicyviolation listener.
   */
  it('should send SecurityPolicyViolation events from csp-violation page', async () => {
    const insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
      test: testInsRequest
    })
    const testUrl = await browser.testHandle.assetURL('csp-violation.html')

    await browser.url(testUrl).then(() => browser.waitForAgentLoad())

    const [insHarvests] = await insightsCapture.waitForResult({ totalCount: 1 })
    const spvEvents = insHarvests.request.body.ins.filter(evt => evt.eventType === 'SecurityPolicyViolation')

    const CSP_HTML_PATH = '/tests/assets/csp-violation.html'
    const commonExpectedFields = {
      eventType: 'SecurityPolicyViolation',
      columnNumber: expect.any(Number),
      currentUrl: expect.stringContaining(CSP_HTML_PATH),
      disposition: 'enforce',
      documentUrl: expect.stringContaining(CSP_HTML_PATH),
      effectiveDirective: 'script-src-elem',
      lineNumber: expect.any(Number),
      originalPolicy: expect.stringMatching(/^default-src 'self' 'unsafe-inline'; connect-src \*;?$/),
      pageUrl: expect.stringContaining(CSP_HTML_PATH),
      referrer: expect.any(String),
      sample: expect.any(String),
      sourceFile: expect.stringContaining(CSP_HTML_PATH),
      statusCode: 200,
      timestamp: expect.any(Number)
    }

    const postInjectionSpv = spvEvents.find(evt => evt.blockedUrl === 'https://example.com/')
    expect(postInjectionSpv).toEqual(expect.objectContaining({
      ...commonExpectedFields,
      blockedUrl: 'https://example.com/'
    }))

    if (browserMatch(onlyChromium)) {
      const preInjectionSpv = spvEvents.find(evt => evt.blockedUrl === 'https://example.com/pre-injection')
      expect(preInjectionSpv).toEqual(expect.objectContaining({
        ...commonExpectedFields,
        blockedUrl: 'https://example.com/pre-injection'
      }))
    }
  })
})
