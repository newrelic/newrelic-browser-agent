import { onlyAndroid } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(onlyAndroid)('android webview', () => {
  it('should load the agent and send back data', async () => {
    // Load up the test page
    const url = await driver.testHandle.assetURL('instrumented.html')
    const addressBar = await $('android=new UiSelector().resourceId("com.webview.myapplication:id/activity_main_textview")')
    await addressBar.clearValue()

    // // Setup expects and submit the url
    const [rumResult, resourcesResult, spaResult] = await Promise.all([
      driver.testHandle.expectRum(),
      driver.testHandle.expectTrace(),
      driver.testHandle.expectInteractionEvents(),
      addressBar.setValue(url)
    ])

    expect(rumResult.request.body).toEqual('')
    expect(rumResult.request.query).toEqual(expect.objectContaining({
      ref: url.slice(0, url.indexOf('?')),
      t: 'Unnamed Transaction'
    }))
    expect(resourcesResult.request.body.length).toBeGreaterThanOrEqual(1)
    expect(spaResult.request.query).toEqual(expect.objectContaining({
      ref: url.slice(0, url.indexOf('?')),
      t: 'Unnamed Transaction'
    }))
    expect(spaResult.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        initialPageURL: url.slice(0, url.indexOf('?')),
        newURL: url.slice(0, url.indexOf('?')),
        oldURL: url.slice(0, url.indexOf('?'))
      })
    ]))
  })
})
