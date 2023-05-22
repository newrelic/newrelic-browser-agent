import runTest from './run-test'

describe('jspdf compatibility', () => {
  let testHandle

  beforeEach(async () => {
    testHandle = await browser.getTestHandle()
  })

  afterEach(async () => {
    await testHandle.destroy()
  })

  it('2.5.1', async () => {
    await runTest({
      browser,
      testHandle,
      testAsset: 'third-party-compatibility/jspdf/2.5.1.html',
      afterLoadCallback: async () => {
        const [errorsResults] = await Promise.all([
          testHandle.expectErrors(5000, true),
          $('body').click() // Setup expects before interacting with page
        ])
        expect(errorsResults).not.toBeDefined()

        const pdfGenerated = await browser.execute(function () {
          return !!pdfGenerated
        })
        expect(pdfGenerated).toEqual(true)
      }
    })
  })
})
