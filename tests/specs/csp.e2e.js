import { faker } from '@faker-js/faker'
import { testInsRequest, testSupportMetricsRequest } from '../../tools/testing-server/utils/expect-tests'

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

  it('should send SecurityPolicyViolation event from csp-violation page', async () => {
    const insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
      test: testInsRequest
    })
    const testUrl = await browser.testHandle.assetURL('csp-violation.html')

    await browser.url(testUrl).then(() => browser.waitForAgentLoad())

    const [insHarvests] = await insightsCapture.waitForResult({ totalCount: 1 })
    const spvEvent = insHarvests.request.body.ins.find(evt => evt.eventType === 'SecurityPolicyViolation')

    const CSP_HTML_PATH = '/tests/assets/csp-violation.html'
    const expectedSpv = {
      eventType: 'SecurityPolicyViolation',
      blockedUri: 'https://example.com/',
      columnNumber: expect.any(Number),
      currentUrl: expect.stringContaining(CSP_HTML_PATH),
      disposition: 'enforce',
      documentUri: expect.stringContaining(CSP_HTML_PATH),
      effectiveDirective: 'script-src-elem',
      lineNumber: 18,
      originalPolicy: expect.stringMatching(/^default-src 'self' 'unsafe-inline'; connect-src \*;?$/),
      pageUrl: expect.stringContaining(CSP_HTML_PATH),
      referrer: expect.any(String),
      sample: expect.any(String),
      sourceFile: expect.stringContaining(CSP_HTML_PATH),
      statusCode: 200,
      timestamp: expect.any(Number)
    }
    expect(spvEvent).toEqual(expect.objectContaining(expectedSpv))
  })
})
