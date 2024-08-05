import { supportsBFCache, supportsCumulativeLayoutShift } from '../../../tools/browser-matcher/common-matchers.mjs'
import querypack from '@newrelic/nr-querypack'

describe('Back/forward cache', () => {
  it.withBrowsersMatching(supportsBFCache)('is not blocked by agent code', async () => {
    let url = await browser.testHandle.assetURL('instrumented.html') // this should use SPA which is full agent
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.execute(function (testId) {
      window.addEventListener('pagehide', (evt) => {
        navigator.sendBeacon(`/echo?testId=${testId}&persisted=${evt.persisted}`)
      })
    }, browser.testHandle.testId)

    const echoPromise = browser.testHandle.expect('assetServer', {
      test: function (request) {
        const url = new URL(request.url, 'resolve://')
        return url.pathname === '/echo'
      }
    })
    url = await browser.testHandle.assetURL('/')
    await browser.url(url)
    const expectedHit = await echoPromise
    expect(expectedHit.request.query.persisted).toEqual('true')
  })

  it('EOL events are sent appropriately', async () => {
    // all timings except "unload" event are expected to be harvested after the first time the page becomes hidden

    let url = await browser.testHandle.assetURL('pagehide.html', { loader: 'rum' })
    await browser.url(url).then(() => browser.waitForAgentLoad())

    let timingsListener = browser.testHandle.expectTimings(5000)
    // 1) Make an interaction and simulate visibilitychange to trigger our "pagehide" logic after loading, after which we expect "final" harvest to occur.
    $('#btn1').click()
    let pvtPayload = (await timingsListener).request

    // 2) Verify PageViewTimings sent sufficient expected timing events, then trigger our "unload" logic.
    const phTimings = pvtPayload?.body?.length ? pvtPayload.body : querypack.decode(pvtPayload.query.e)
    expect(phTimings.length).toBeGreaterThan(1) // should be more timings than "pagehide" at min -- this can increase for confidence when CLS & INP are added

    let phNode = phTimings.find(t => t.name === 'pageHide')
    expect(phNode.value).toBeGreaterThan(0) // vis hidden emits the pageHide event
    let ulNode = phTimings.find(t => t.name === 'unload')
    expect(ulNode).toBeUndefined() // vis hidden doesn't emit unload event

    timingsListener = browserMatch(supportsCumulativeLayoutShift) ? browser.testHandle.expectFinalTimings(7000) : browser.testHandle.expectTimings(7000)
    await browser.url(await browser.testHandle.assetURL('/'))
    pvtPayload = (await timingsListener).request

    // 3) Verify PVTs aren't sent again but unload event is; (TEMPORARY) pageHide event should not be sent again
    const ulTimings = pvtPayload?.body?.length ? pvtPayload.body : querypack.decode(pvtPayload.query.e)
    expect(ulTimings.length).toBeGreaterThan(0) // "unload" & ongoing CWV lib metrics like INP--if supported--should be harvested here

    ulNode = ulTimings.find(t => t.name === 'unload')
    expect(ulNode.value).toBeGreaterThan(0) // window pagehide emits the unload event
    phNode = ulTimings.find(t => t.name === 'pageHide')
    expect(phNode).toBeUndefined() // but pageHide is not emitted again (capped at one)
  })
})
