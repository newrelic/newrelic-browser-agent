import { config, decodeAttributes, testExpectedReplay } from './helpers'
import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('Session Replay Payload Validation', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should allow for preload if already recording', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    await browser.enableSessionReplay()
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    const [{ request: harvestContents }, wasPreloaded] = await Promise.all([
      browser.testHandle.expectBlob(), // preload harvest
      browser.execute(function () {
        return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
      })
    ])

    testExpectedReplay({ data: harvestContents })
    expect(wasPreloaded).toEqual(true)
  })

  it('should allow for preload if configured', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { preload: true } })))
      .then(() => browser.waitForAgentLoad())

    const [{ request: harvestContents }, wasPreloaded] = await Promise.all([
      browser.testHandle.expectBlob(), // preload harvest
      browser.execute(function () {
        return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
      })
    ])

    testExpectedReplay({ data: harvestContents })
    expect(wasPreloaded).toEqual(true)
  })

  it('should NOT preload if not configured or recording', async () => {
    const [{ request: harvestContents }, wasPreloaded] = await Promise.all([
      browser.testHandle.expectBlob(), // preload harvest
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { preload: false } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
        }))
    ])

    testExpectedReplay({ data: harvestContents })
    expect(wasPreloaded).toEqual(false)
  })

  it('should NOT harvest beginning preload data if not sampled', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { preload: true, sampling_rate: 0, error_sampling_rate: 0 } })))
      .then(() => browser.waitForAgentLoad())

    const [wasPreloaded] = await Promise.all([
      browser.execute(function () {
        return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
      }),
      browser.testHandle.expectBlob(10000, true) // preload harvest should not send
    ])

    expect(wasPreloaded).toEqual(true)
  })

  it('should continue harvesting when start called after refresh with an existing session replay', async () => {
    const [, wasPreloaded1] = await Promise.all([
      browser.testHandle.expectBlob(10000),
      browser.url(await browser.testHandle.assetURL('session_replay/64kb-dom-manual-start.html', config({ session_replay: { preload: false, autoStart: false } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
        }))
    ])

    expect(wasPreloaded1).toEqual(false)

    const [{ request: harvestContents }, { request: harvestContents2 }, wasPreloaded2] = await browser.refresh().then(() => Promise.all([
      browser.testHandle.expectBlob(10000),
      browser.testHandle.expectBlob(10000),
      browser.waitForAgentLoad()
        .then(() => browser.execute(function () {
          return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
        }))
    ]))

    expect(decodeAttributes(harvestContents.query.attributes).hasSnapshot || decodeAttributes(harvestContents2.query.attributes).hasSnapshot).toBeTruthy()
    expect(wasPreloaded2).toEqual(true)
    testExpectedReplay({ data: harvestContents })
  })
})
