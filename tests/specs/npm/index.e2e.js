import { es2022Support } from '../../../tools/browser-matcher/common-matchers.mjs'
import { apiMethods, asyncApiMethods } from '../../../src/loaders/api/api-methods'

const testBuilds = [
  'browser-agent',
  'custom-agent-lite',
  'custom-agent-pro',
  'custom-agent-spa',
  'worker-agent',
  'custom-agent-pro-deprecated-features'
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
      ;[['dist', 'browser-agent-wrapper'], ['src', 'raw-src-wrapper']].forEach(([type, wrapper]) => {
        it(`${type}/${testBuild} exposes the correct API methods`, async () => {
          await browser.url(await browser.testHandle.assetURL(`test-builds/${wrapper}/${testBuild}.html`))

          const NREUMProps = await getAgentProps('NREUM')
          const newrelicProps = await getAgentProps('newrelic')
          const agentApiProps = await getAgentProps('window.agent.api')

          ;[NREUMProps, newrelicProps, agentApiProps].forEach(keys => {
            expect(keys).toEqual(expect.arrayContaining([
              ...apiMethods,
              ...asyncApiMethods
            ]))
          })
        })
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

  it('vite-react-wrapper should not break agent when session manager cannot be imported', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('assetServer', {
      test: function (request) {
        const url = new URL(request.url, 'resolve://')
        return (url.pathname.includes('agent-session'))
      },
      permanent: true,
      statusCode: 500,
      body: ''
    })

    const [ajaxPromise] = await Promise.all([
      browser.testHandle.expectAjaxTimeSlices(),
      browser.url(await browser.testHandle.assetURL('test-builds/vite-react-wrapper/index.html'))
    ])
    expect(ajaxPromise.request.body.xhr).toBeDefined()

    const agentSession = await browser.getAgentSessionInfo()
    Object.values(agentSession.agentSessions).forEach(val =>
      expect(val).toEqual({})
    )
    Object.values(agentSession.agentSessionInstances).forEach(val =>
      expect(val).toEqual({})
    )
    expect(agentSession.localStorage).toEqual({})
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
