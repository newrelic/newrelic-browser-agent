import { es2022Support } from '../../../tools/browser-matcher/common-matchers.mjs'

const testBuilds = [
  'browser-agent',
  'custom-agent-lite',
  'custom-agent-pro',
  'custom-agent-spa',
  'worker-agent'
]

describe.withBrowsersMatching(es2022Support)('basic npm agent', () => {
  testBuilds.forEach(testBuild => {
    it(`dist/${testBuild} sends RUM call`, async () => {
      const [rumPromise] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL(`test-builds/browser-agent-wrapper/${testBuild}.html`))
      ])

      expect(rumPromise).toBeDefined()
    })

    it(`src/${testBuild} sends RUM call`, async () => {
      const [rumPromise] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL(`test-builds/raw-src-wrapper/${testBuild}.html`))
      ])

      expect(rumPromise).toBeDefined()
    })
  })

  it('vite-react-wrapper sends RUM call', async () => {
    const [rumPromise] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('test-builds/vite-react-wrapper/index.html'))
    ])

    expect(rumPromise).toBeDefined()
  })
})
