import { testAjaxTimeSlicesRequest, testErrorsRequest, testInsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

const testBuilds = [
  'browser-agent',
  'custom-agent-lite',
  'custom-agent-pro',
  'custom-agent-spa',
  'worker-agent',
  'custom-agent-pro-deprecated-features'
]

describe('basic npm agent', () => {
  let rumCapture
  let errorsCapture
  let insightsCapture

  beforeEach(async () => {
    [rumCapture, errorsCapture, insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testErrorsRequest },
      { test: testInsRequest }
    ])
  })

  testBuilds.forEach(testBuild => {
    it(`dist/${testBuild} sends basic calls`, async () => {
      const [rumHarvests] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL(`test-builds/browser-agent-wrapper/${testBuild}.html`))
      ])
      expect(rumHarvests[0]).toBeDefined()

      if (!testBuild.includes('worker') && !testBuild.includes('lite')) {
        const [errorsHarvests, insightsHarvests] = await Promise.all([
          errorsCapture.waitForResult({ totalCount: 1 }),
          insightsCapture.waitForResult({ totalCount: 1 }),
          browser.execute(function () {
            window.agent.noticeError('test')
            newrelic.addPageAction('test')
          })
        ])
        expect(errorsHarvests[0]).toBeDefined()
        expect(insightsHarvests[0]).toBeDefined()
      }
    })

    it(`src/${testBuild} sends basic calls`, async () => {
      const [rumHarvests] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL(`test-builds/raw-src-wrapper/${testBuild}.html`))
      ])
      expect(rumHarvests[0]).toBeDefined()

      if (!testBuild.includes('worker') && !testBuild.includes('lite')) {
        const [errorsHarvests, insightsHarvests] = await Promise.all([
          errorsCapture.waitForResult({ totalCount: 1 }),
          insightsCapture.waitForResult({ totalCount: 1 }),
          browser.execute(function () {
            window.agent.noticeError('test')
            newrelic.addPageAction('test')
          })
        ])
        expect(errorsHarvests[0]).toBeDefined()
        expect(insightsHarvests[0]).toBeDefined()
      }
    })
  })

  it('vite-react-wrapper sends basic calls', async () => {
    const [rumHarvests] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('test-builds/vite-react-wrapper/index.html'))
    ])
    expect(rumHarvests[0]).toBeDefined()

    const [errorsHarvests, insightsHarvests] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      insightsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () {
        window.agent.noticeError('test')
        newrelic.addPageAction('test')
      })
    ])
    expect(errorsHarvests[0]).toBeDefined()
    expect(insightsHarvests[0]).toBeDefined()
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
    const ajaxCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testAjaxTimeSlicesRequest })

    const [ajaxHarvests] = await Promise.all([
      ajaxCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('test-builds/vite-react-wrapper/index.html'))
    ])
    expect(ajaxHarvests[0].request.body.xhr).toBeDefined()

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

