import { testBlobReplayRequest } from '../../../tools/testing-server/utils/expect-tests'
import { srConfig, getSR } from '../util/helpers'

describe('Session Replay Ingest Behavior', () => {
  let sessionReplaysCapture

  beforeEach(async () => {
    sessionReplaysCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  it('should empty event buffer when sending', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await sessionReplaysCapture.waitForResult({ totalCount: 1 }) // snapshot

    expect((await getSR()).events.length).toEqual(0)
  })
})
