import SpecMatcher from '../../tools/browser-matcher/spec-matcher.mjs'
import { notInternetExplorer } from '../../tools/browser-matcher/common-matchers.mjs'

const notChrome = new SpecMatcher()
  .exclude('chrome')

describe('newrelic api', () => {
  let testHandle

  beforeEach(async () => {
    testHandle = await browser.getTestHandle()
  })

  afterEach(async () => {
    await testHandle.destroy()
  })

  // test(notInternetExplorer)('not ie', async () => {
  //   const url = await testHandle.assetURL('instrumented.html', {
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

  test(notChrome)('not chrome', async () => {
    const url = await testHandle.assetURL('instrumented.html', {
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
})
