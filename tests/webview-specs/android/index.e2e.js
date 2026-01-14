import { onlyAndroid } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testBlobTraceRequest, testInteractionEventsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe.withBrowsersMatching(onlyAndroid)('android webview', () => {
  it('should load the agent and send back data', async () => {
    const [rumCapture, sessionTraceCapture, interactionsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testBlobTraceRequest },
      { test: testInteractionEventsRequest }
    ])

    // Load up the test page
    const url = await driver.testHandle.assetURL('instrumented.html')
    const addressBar = await $('android=new UiSelector().resourceId("com.webview.myapplication:id/activity_main_textview")')
    await addressBar.clearValue()

    // // Setup expects and submit the url
    const [rumHarvests, sessionTraceHarvests, interactionHarvests] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      sessionTraceCapture.waitForResult({ totalCount: 1 }),
      interactionsCapture.waitForResult({ totalCount: 1 }),
      addressBar.setValue(url)
    ])

    expect(rumHarvests[0].request.body).toEqual({ ja: { webdriverDetected: false } })
    expect(rumHarvests[0].request.query).toEqual(expect.objectContaining({
      ref: url.slice(0, url.indexOf('?')),
      t: 'Unnamed Transaction'
    }))
    expect(sessionTraceHarvests[0].request.body.length).toBeGreaterThanOrEqual(1)
    expect(interactionHarvests[0].request.query).toEqual(expect.objectContaining({
      ref: url.slice(0, url.indexOf('?')),
      t: 'Unnamed Transaction'
    }))

    expect(interactionHarvests[0].request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        initialPageURL: url.slice(0, url.indexOf('?')),
        newURL: url.slice(0, url.indexOf('?')),
        oldURL: '' // referrer is empty since this is a hard direct page load
      })
    ]))
  })
})
