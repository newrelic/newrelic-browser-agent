import Matcher from '../../tools/jil/util/browser-matcher'

describe('newrelic api', () => {
  let testHandle

  beforeEach(async () => {
    testHandle = await browser.getTestHandle()
  })

  afterEach(async () => {
    await testHandle.destroy()
  })

  test(Matcher.withFeature('notInternetExplorer'))('not ie', async () => {
    const url = await testHandle.assetURL('api/session-storage-disallowed.html', {
      loader: 'spa'
    })

    await Promise.all([
      testHandle.expectRum(),
      browser.url(url)
    ])
    const result = await browser.execute(function () {
      return typeof window.newrelic.addToTrace === 'function'
    })

    expect(result).toEqual(true)
  })

  // test(Matcher.withFeature('workerStackSizeGeneratesError'))('not firefox', async () => {
  //   const url = await testHandle.assetURL('api/session-storage-disallowed.html', {
  //     loader: 'spa'
  //   })

  //   await Promise.all([
  //     testHandle.expectRum(),
  //     browser.url(url)
  //   ])
  //   const result = await browser.execute(function () {
  //     return typeof window.newrelic.addToTrace === 'function'
  //   })

  //   expect(result).toEqual(true)
  // })
})
