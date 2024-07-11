import { assertExpectedErrors } from './assertion-helper'
import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('setErrorHandler API', () => {
  let errorsCapture

  beforeEach(async () => {
    errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
  })

  it('ignores errors', async () => {
    const url = await browser.testHandle.assetURL('ignored-error.html', {
      init: {
        page_view_timing: { enabled: false },
        metrics: { enabled: false },
        jserrors: { harvestTimeSeconds: 2 }
      }
    })

    const [errorsResults] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(url)
    ])

    expect(errorsResults[0].request.query.pve).toEqual('1') // page view error reported

    const expectedErrors = [{
      name: 'Error',
      message: 'report',
      stack: [{
        u: '<inline>',
        l: 23
      }]
    }]
    assertExpectedErrors(errorsResults[0].request.body.err, expectedErrors, url)
  })

  it('custom fingerprinting labels errors correctly', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', {
      init: {
        page_view_timing: { enabled: false },
        metrics: { enabled: false },
        jserrors: { harvestTimeSeconds: 2 }
      }
    })

    const [errorsResults] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(url)
        .then(() => browser.execute(function () {
          newrelic.setErrorHandler(function (err) {
            switch (err.message) {
              case 'much':
              case 'wow':
                return { group: 'doge' }
              case 'meh':
                return { group: '' }
              case 'such':
                return false
              default:
                return true
            }
          })
          newrelic.noticeError('much')
          newrelic.noticeError('such')
          newrelic.noticeError('meh')
          newrelic.noticeError('wow')
          newrelic.noticeError('boop')
        }))
    ])

    const expectedMsgToGroup = {
      much: 'doge',
      such: undefined,
      wow: 'doge'
    }
    errorsResults[0].request.body.err.forEach(({ params }) => {
      expect(params.message in expectedMsgToGroup).toEqual(true)
      expect(params.errorGroup).toEqual(expectedMsgToGroup[params.message])
    })
  })
})
