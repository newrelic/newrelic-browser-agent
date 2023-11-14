import { notIE } from '../../tools/browser-matcher/common-matchers.mjs'
import { faker } from '@faker-js/faker'

describe('Content Security Policy', () => {
  it.withBrowsersMatching(notIE)('should support a nonce script element', async () => {
    const nonce = faker.datatype.uuid()
    await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { nonce }))
        .then(() => browser.waitForAgentLoad())
    ])

    const foundNonce = await browser.execute(function () {
      var scriptTags = document.querySelectorAll('script')
      var nonceValues = []
      for (let i = 0; i < scriptTags.length; i++) {
        nonceValues.push(scriptTags[i].nonce)
      }
      return nonceValues
    })

    expect(foundNonce).toEqual([nonce, nonce, nonce, nonce])
  })

  it.withBrowsersMatching(notIE)('should send a nonce supportability metric', async () => {
    const nonce = faker.datatype.uuid()
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
    await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('subresource-integrity-capture.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    const foundIntegrityValues = await browser.execute(function () {
      return window.chunkIntegratyValues
    })

    expect(foundIntegrityValues.length).toEqual(1)
    expect(foundIntegrityValues[0]).toMatch(/^sha512-[a-zA-Z0-9=/+]+$/)
  })
})
