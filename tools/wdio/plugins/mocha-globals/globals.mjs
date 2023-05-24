import '../../../jest-matchers/index.mjs'

/**
 * This file is executed by mocha in each WDIO execution thread.
 */

beforeEach(async () => {
  const testHandle = await browser.getTestHandle()
  browser.testHandle = testHandle
})

afterEach(async () => {
  await browser.destroyAgentSession(browser.testHandle)

  if (browser.testHandle) {
    browser.testHandle.destroy()
  }
})
