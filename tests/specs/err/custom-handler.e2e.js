import { assertExpectedErrors } from './assertion-helper'

describe('setErrorHandler API', () => {
  it('ignores errors', async () => {
    let url = await browser.testHandle.assetURL('ignored-error.html', {
      init: {
        page_view_timing: { enabled: false },
        metrics: { enabled: false },
        jserrors: { harvestTimeSeconds: 2 }
      }
    })

    let errors = browser.testHandle.expectErrors()
    await browser.url(url).then(() => browser.waitUntil(() => browser.execute(function () {
      return window.errorsThrown === true
    }), { timeout: 30000 }))

    let request = (await errors).request
    expect(request.query.pve).toEqual('1') // page view error reported

    const expectedErrors = [{
      name: 'Error',
      message: 'report',
      stack: [{
        u: '<inline>',
        l: 23
      }]
    }]
    assertExpectedErrors(request.body.err, expectedErrors, url)
  })

  it('custom fingerprinting labels errors correctly', async () => {
    let url = await browser.testHandle.assetURL('instrumented.html', {
      init: {
        page_view_timing: { enabled: false },
        metrics: { enabled: false },
        jserrors: { harvestTimeSeconds: 2 }
      }
    })

    let errors = browser.testHandle.expectErrors()
    await browser.url(url).then(() => browser.waitForAgentLoad())
    await browser.execute(function () {
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
    })

    let request = (await errors).request
    expect(request.body.err.length).toEqual(3)

    const expectedMsgToGroup = {
      much: 'doge',
      such: undefined,
      wow: 'doge'
    }
    request.body.err.forEach(({ params }) => {
      expect(params.message in expectedMsgToGroup).toEqual(true)
      expect(params.errorGroup).toEqual(expectedMsgToGroup[params.message])
    })
  })
})
