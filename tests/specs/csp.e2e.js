import { notIE } from '../../tools/browser-matcher/common-matchers.mjs'
import { faker } from '@faker-js/faker'

describe.withBrowsersMatching(notIE)('Content Security Policy', () => {
  it('should support a nonce script element', async () => {
    const nonce = faker.string.uuid()
    await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { nonce }))
        .then(() => browser.waitForAgentLoad())
    ])

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

  it.withBrowsersMatching(notIE)('should send a nonce supportability metric', async () => {
    const nonce = faker.string.uuid()
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { nonce }))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Runtime/Nonce/Detected' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
  })

  it('should load async chunk with subresource integrity', async () => {
    await browser.enableSessionReplay()

    const url = await browser.testHandle.assetURL('subresource-integrity-capture.html', {
      init: {
        privacy: { cookies_enabled: true },
        session_replay: { enabled: true, sampling_rate: 100, error_sampling_rate: 100 }
      }
    })
    await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

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
