import runTest from './run-test'

describe('requirejs compatibility', () => {
  let testHandle

  beforeEach(async () => {
    testHandle = await browser.getTestHandle()
  })

  afterEach(async () => {
    await testHandle.destroy()
  })

  it('2.3.6', async () => {
    await runTest({
      browser,
      testHandle,
      testAsset: 'third-party-compatibility/requirejs/2.3.6.html'
    })
  })
})
