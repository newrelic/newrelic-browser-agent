import { notIOS, onlyChrome } from '../../../tools/browser-matcher/common-matchers.mjs'
import { srConfig, decodeAttributes, getSR } from '../util/helpers'
import { testBlobReplayRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Session Replay Harvest Behavior', () => {
  let sessionReplaysCapture

  beforeEach(async () => {
    sessionReplaysCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  // Size based harvest tests below have trouble loading/working on iOS

  it.withBrowsersMatching(notIOS)('should harvest early if exceeds preferred size', async () => {
    const start = Date.now()
    const [[{ request: blobHarvest }]] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html', srConfig({ harvester: { interval: 60 } })))
        .then(() => browser.waitForSessionReplayRecording())
    ])

    const end = Date.now()

    expect(blobHarvest.body.length).toBeGreaterThan(0)
    expect(end - start).toBeLessThan(60000)
  })

  /** Some of the other browsers can crash with the way we load this massive page. need to reconsider this test at some point */
  it.withBrowsersMatching(onlyChrome)('should abort if exceeds maximum size', async () => {
    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('1mb-dom.html', srConfig()))
    ])

    expect(sessionReplayHarvests.length).toEqual(0)
    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      blocked: true,
      initialized: true
    }))
  })

  it.withBrowsersMatching(notIOS)('should set timestamps on each payload', async () => {
    await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1, timeout: 10000 }), // snapshot, type = 2
      browser.url(await browser.testHandle.assetURL('64kb-dom.html', srConfig()))
    ])

    // generate a second payload by clicking on an element
    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 2, timeout: 10000 }), // mutation, type = 3
      browser.execute(function () {
        document.getElementById('foobar').click()
      })
    ])

    expect(sessionReplayHarvests[0].request.body.length).toBeGreaterThan(0)
    const attr1 = decodeAttributes(sessionReplayHarvests[0].request.query.attributes)
    expect(attr1['replay.firstTimestamp']).toBeGreaterThan(0)
    expect(attr1['replay.lastTimestamp']).toBeGreaterThan(0)
    expect(attr1['replay.firstTimestamp']).toEqual(sessionReplayHarvests[0].request.body[0].timestamp)
    expect(attr1['replay.lastTimestamp']).toEqual(sessionReplayHarvests[0].request.body[sessionReplayHarvests[0].request.body.length - 1].timestamp)
    expect(attr1['session.durationMs']).toBeGreaterThan(0)

    expect(sessionReplayHarvests[1].request.body.length).toBeGreaterThan(0)
    const attr2 = decodeAttributes(sessionReplayHarvests[1].request.query.attributes)
    expect(attr2['replay.firstTimestamp']).toBeGreaterThan(0)
    expect(attr2['replay.lastTimestamp']).toBeGreaterThan(0)
    expect(attr2['replay.firstTimestamp']).toEqual(sessionReplayHarvests[1].request.body[0].timestamp)
    expect(attr2['replay.lastTimestamp']).toEqual(sessionReplayHarvests[1].request.body[sessionReplayHarvests[1].request.body.length - 1].timestamp)
    expect(attr2['session.durationMs']).toBeGreaterThan(0)

    expect(attr1['replay.firstTimestamp']).not.toEqual(attr2['replay.firstTimestamp'])
    expect(attr1['replay.lastTimestamp']).not.toEqual(attr2['replay.lastTimestamp'])

    expect(parseInt(sessionReplayHarvests[0].request.query.timestamp, 10)).toEqual(attr1['replay.firstTimestamp'])
    expect(parseInt(sessionReplayHarvests[1].request.query.timestamp, 10)).toEqual(attr2['replay.firstTimestamp'])
  })

  it('should use sendBeacon for unload harvests', async () => {
    await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ harvester: { interval: 30 } })))
        .then(() => browser.execute(function () {
          const sendBeaconFn = navigator.sendBeacon.bind(navigator)
          navigator.sendBeacon = function (url, body) {
            sendBeaconFn.call(navigator, url + '&sendBeacon=true', body)
          }
        }))
    ])

    await browser.execute(function () {
      var newelem = document.createElement('span')
      newelem.innerHTML = 'this is some text'
      document.body.appendChild(newelem)
    })

    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    expect(sessionReplayHarvests.length).toBeGreaterThan(1)
    expect(sessionReplayHarvests[sessionReplayHarvests.length - 1].request.query.sendBeacon).toEqual('true')
  })
})
