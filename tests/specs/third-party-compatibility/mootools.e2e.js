import runTest from './run-test'

describe('mootools compatibility', () => {
  let testHandle

  beforeEach(async () => {
    testHandle = await browser.getTestHandle()
  })

  afterEach(async () => {
    await testHandle.destroy()
  })

  it('1.6.0-nocompat', async () => {
    await runTest({
      browser,
      testHandle,
      testAsset: 'third-party-compatibility/mootools/1.6.0-nocompat.html',
      afterLoadCallback: async () => {
        const [eventsResults] = await Promise.all([
          testHandle.expectEvents(),
          $('body').click() // Setup expects before interacting with page
        ])

        const jsonpRequest = eventsResults.request.body
          .find(interaction =>
            Array.isArray(interaction.children) && interaction.children.findIndex(childNode =>
              childNode.type === 'ajax' && childNode.path === '/jsonp'
            ) > -1
          )
        expect(jsonpRequest).toBeDefined()
        expect(Array.isArray(jsonpRequest.children)).toEqual(true)
      }
    })
  })
})
