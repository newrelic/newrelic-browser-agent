import { es2022Support } from '../../../tools/browser-matcher/common-matchers.mjs'
import { apiMethods, asyncApiMethods } from '../../../src/loaders/api/api-methods'

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
            newrelic.addPageAction('test')
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
            newrelic.addPageAction('test')
          })
        ])
        expect(errorsPromise).toBeDefined()
        expect(pageActionPromise).toBeDefined()
      }
    })

    if (testBuild !== 'worker-agent') {
      it(`dist/${testBuild} exposes the correct API methods`, async () => {
        await browser.url(await browser.testHandle.assetURL(`test-builds/browser-agent-wrapper/${testBuild}.html`))

        const agentProps = await getAgentProps('window.agent')
        const agentApiProps = await getAgentProps('window.agent.api')

        expect(agentProps).toEqual(expect.arrayContaining([
          ...apiMethods,
          ...asyncApiMethods
        ]))

        expect(agentApiProps).toEqual(expect.arrayContaining([
          ...apiMethods,
          ...asyncApiMethods
        ]))
      })

      it(`src/${testBuild} exposes the correct API methods`, async () => {
        await browser.url(await browser.testHandle.assetURL(`test-builds/raw-src-wrapper/${testBuild}.html`))

        const agentProps = await getAgentProps('window.agent')
        const agentApiProps = await getAgentProps('window.agent.api')

        expect(agentProps).toEqual(expect.arrayContaining([
          ...apiMethods,
          ...asyncApiMethods
        ]))

        expect(agentApiProps).toEqual(expect.arrayContaining([
          ...apiMethods,
          ...asyncApiMethods
        ]))
      })
    }
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
        newrelic.addPageAction('test')
      })
    ])
    expect(errorsPromise).toBeDefined()
    expect(pageActionPromise).toBeDefined()
  })
})

async function getAgentProps (variablePath) {
  return browser.execute(function (varPath) {
    function getAllPropertyNames (obj) {
      let result = new Set()
      while (obj) {
        Object.getOwnPropertyNames(obj).forEach(p => result.add(p))
        obj = Object.getPrototypeOf(obj)
      }
      return [...result]
    }
    // eslint-disable-next-line no-eval
    return getAllPropertyNames(eval(varPath))
  }, variablePath)
}
