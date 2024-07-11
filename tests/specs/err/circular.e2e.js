import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('circular references', () => {
  let errorsCapture

  beforeEach(async () => {
    errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
  })

  it('are encoded properly when error message contains a circular reference', async () => {
    const [errorsResults] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('circular.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errorsResults[0].request.body.err.length).toBe(1) // exactly one error
    expect(errorsResults[0].request.body.err[0].params.message).toBe('[object Object]')
  })
})
