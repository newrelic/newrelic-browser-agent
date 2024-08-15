import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('RUM request under session', () => {
  let rumCapture

  beforeEach(async () => {
    rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  it('is not included when session is disabled', async () => {
    const [[rumHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(
        await browser.testHandle.assetURL('instrumented.html', { init: { privacy: { cookies_enabled: false } } })
      ).then(() => browser.waitForAgentLoad())
    ])

    expect(rumHarvest.request.query.fsh).toBeUndefined()
  })

  it('is included and correctly set with session', async () => {
    let [rumHarvests] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(
        await browser.testHandle.assetURL('instrumented.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    expect(rumHarvests[0].request.query.fsh).toEqual('1') // for the first page load of a session

    ;[rumHarvests] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 2 }),
      browser.url(
        await browser.testHandle.assetURL('instrumented.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    expect(rumHarvests[1].request.query.fsh).toEqual('0') // for subsequent page loads of the same session
  })
})
