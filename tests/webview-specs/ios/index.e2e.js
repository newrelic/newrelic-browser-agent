import { onlyIOS } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(onlyIOS)('ios webview', () => {
  it('should load the agent and send back data', async () => {
    // Load the webview screen
    await $('-ios predicate string: name == "WebView"').click()

    // Load up the test page
    const url = await driver.testHandle.assetURL('instrumented.html')
    await driver.setClipboard(Buffer.from(url).toString('base64'), 'plaintext')
    const addressBar = await $('-ios predicate string: type == "XCUIElementTypeTextField"')
    await addressBar.clearValue()
    await driver.touchPerform([
      {
        action: 'press',
        options: {
          element: addressBar.elementId
        }
      },
      {
        action: 'wait',
        options: {
          ms: 200
        }
      },
      {
        action: 'release',
        options: {}
      }
    ])
    await $('-ios predicate string: label == "Paste" AND name == "Paste" AND value == "Paste"')
      .click()

    // // Setup expects and submit the url
    const [rumResult, resourcesResult, spaResult] = await Promise.all([
      driver.testHandle.expectRum(),
      driver.testHandle.expectTrace(),
      driver.testHandle.expectInteractionEvents(),
      $('-ios predicate string: name == "Return"').click()
    ])

    expect(rumResult.request.body).toEqual('')
    expect(rumResult.request.query).toEqual(expect.objectContaining({
      ref: url.slice(0, url.indexOf('?')),
      t: 'Unnamed Transaction'
    }))
    expect(resourcesResult.request.query).toEqual(expect.objectContaining({
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
