import runTest from './run-test'

describe('requirejs compatibility', () => {
  it('2.3.6', async () => {
    await runTest({
      browser,
      testAsset: 'third-party-compatibility/requirejs/2.3.6.html'
    })
  })
})
