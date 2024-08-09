import { supportsBFCache } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Back/forward cache', () => {
  it.withBrowsersMatching(supportsBFCache)('is not blocked by agent code', async () => {
    const networkCapture = await browser.testHandle.createNetworkCaptures('assetServer', {
      test: function (request) {
        const url = new URL(request.url, 'resolve://')
        return url.pathname === '/echo'
      }
    })

    await browser.url(
      await browser.testHandle.assetURL('instrumented.html')
    ).then(() => browser.waitForAgentLoad())

    await browser.execute(function (testId) {
      window.addEventListener('pagehide', (evt) => {
        navigator.sendBeacon(`/echo?testId=${testId}&persisted=${evt.persisted}`)
      })
    }, browser.testHandle.testId)

    const [sendBeaconHarvests] = await Promise.all([
      networkCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    expect(sendBeaconHarvests.length).toEqual(1)
    expect(sendBeaconHarvests[0].request.query.persisted).toEqual('true')
  })

  it('EOL events are sent appropriately', async () => {
    const timingsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
      test: testTimingEventsRequest
    })

    // all timings except "unload" event are expected to be harvested after the first time the page becomes hidden
    await browser.url(
      await browser.testHandle.assetURL('pagehide.html', { loader: 'rum' })
    ).then(() => browser.waitForAgentLoad())

    // 1) Make an interaction and simulate visibilitychange to trigger our "pagehide" logic after loading, after which we expect "final" harvest to occur.
    const [firstTimingsHarvests] = await Promise.all([
      timingsCapture.waitForResult({ totalCount: 1 }),
      $('#btn1').click()
    ])

    // 2) Verify PageViewTimings sent sufficient expected timing events, then trigger our "unload" logic.
    expect(firstTimingsHarvests[0].request.body.length).toBeGreaterThan(1) // should be more timings than "pagehide" at min -- this can increase for confidence when CLS & INP are added

    let phNode = firstTimingsHarvests
      .find(harvest => harvest.request.body.some(timing => timing.name === 'pageHide'))
      .request.body
      .find(timing => timing.name === 'pageHide')
    expect(phNode.value).toBeGreaterThan(0) // vis hidden emits the pageHide event
    let ulNode = firstTimingsHarvests
      .find(harvest => harvest.request.body.some(timing => timing.name === 'unload'))
    expect(ulNode).toBeUndefined() // vis hidden doesn't emit unload event

    const [secondTimingsHarvests] = await Promise.all([
      timingsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    // 3) Verify PVTs aren't sent again but unload event is; (TEMPORARY) pageHide event should not be sent again
    const ulTimings = secondTimingsHarvests.slice(1)
    expect(ulTimings.length).toBeGreaterThan(0) // "unload" & ongoing CWV lib metrics like INP--if supported--should be harvested here

    ulNode = ulTimings
      .find(harvest => harvest.request.body.some(timing => timing.name === 'unload'))
      .request.body
      .find(timing => timing.name === 'unload')
    expect(ulNode.value).toBeGreaterThan(0) // window pagehide emits the unload event
    phNode = ulTimings
      .find(harvest => harvest.request.body.some(timing => timing.name === 'pageHide'))
    expect(phNode).toBeUndefined() // but pageHide is not emitted again (capped at one)
  })
})
