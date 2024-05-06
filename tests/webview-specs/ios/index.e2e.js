import { onlyIOS } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(onlyIOS)('ios webview', () => {
  before(async () => {
    // Load the webview screen
    await $('-ios predicate string: name == "WebView"').click()
    await driver.pause(5000)
  })

  it('should load the agent and send back data', async () => {
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
          ms: 500
        }
      },
      {
        action: 'release',
        options: {}
      }
    ])
    await $('-ios predicate string: type == "XCUIElementTypeMenuItem" AND label == "Paste" AND name == "Paste"')
      .click()

    // // Setup expects and submit the url
    const [rumResult, resourcesResult, spaResult] = await Promise.all([
      driver.testHandle.expectRum(),
      driver.testHandle.expectResources(),
      driver.testHandle.expectInteractionEvents(),
      $('-ios predicate string: type == "XCUIElementTypeButton" AND name == "Return"').click()
    ])

    console.log(rumResult)
    console.log(resourcesResult)
    console.log(spaResult)
    expect(rumResult.request.body).toEqual('')
    expect(rumResult.request.query).toEqual(expect.objectContaining({
      ref: url.slice(0, url.indexOf('?')),
      t: 'Unnamed Transaction'
    }))
    expect(resourcesResult.request.query).toEqual(expect.objectContaining({
      ref: url.slice(0, url.indexOf('?')),
      t: 'Unnamed Transaction'
    }))
    expect(resourcesResult.request.body.res.length).toBeGreaterThanOrEqual(1)
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
