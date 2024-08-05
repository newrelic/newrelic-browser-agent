import { faker } from '@faker-js/faker'
import { testSupportMetricsRequest } from '../../tools/testing-server/utils/expect-tests'

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
})
