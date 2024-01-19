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
    it(`dist/${testBuild} sends basic calls`, async () => {
      const [rumPromise] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL(`test-builds/browser-agent-wrapper/${testBuild}.html`))
      ])
      expect(rumPromise).toBeDefined()

      if (!testBuild.includes('worker') && !testBuild.includes('lite')) {
        const [errorsPromise, pageActionPromise] = await Promise.all([
          browser.testHandle.expectErrors(),
          browser.testHandle.expectIns(),
          browser.execute(function () {
            window.agent.noticeError('test')
            window.agent.addPageAction('test')
          })
        ])
        expect(errorsPromise).toBeDefined()
        expect(pageActionPromise).toBeDefined()
      }
    })

    it(`src/${testBuild} sends basic calls`, async () => {
      const [rumPromise] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL(`test-builds/raw-src-wrapper/${testBuild}.html`))
      ])
      expect(rumPromise).toBeDefined()

      if (!testBuild.includes('worker') && !testBuild.includes('lite')) {
        const [errorsPromise, pageActionPromise] = await Promise.all([
          browser.testHandle.expectErrors(),
          browser.testHandle.expectIns(),
          browser.execute(function () {
            window.agent.noticeError('test')
            window.agent.addPageAction('test')
          })
        ])
        expect(errorsPromise).toBeDefined()
        expect(pageActionPromise).toBeDefined()
      }
    })
  })

  it('vite-react-wrapper sends basic calls', async () => {
    const [rumPromise] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('test-builds/vite-react-wrapper/index.html'))
    ])
    expect(rumPromise).toBeDefined()

    const [errorsPromise, pageActionPromise] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.testHandle.expectIns(),
      browser.execute(function () {
        window.agent.noticeError('test')
        window.agent.addPageAction('test')
      })
    ])
    expect(errorsPromise).toBeDefined()
    expect(pageActionPromise).toBeDefined()
  })
})
