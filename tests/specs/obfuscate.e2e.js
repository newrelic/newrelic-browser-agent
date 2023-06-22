import { supportsFetchExtended } from '../../tools/browser-matcher/common-matchers.mjs'

const config = {
  init: {
    obfuscate: [{
      regex: /bam-test/g,
      replacement: 'OBFUSCATED'
    }, {
      regex: /fakeid/g
    }, {
      regex: /pii/g,
      replacement: 'OBFUSCATED'
    }, {
      regex: /comma/g,
      replacement: 'invalid,string'
    }, {
      regex: /semicolon/g,
      replacement: 'invalid;string'
    }, {
      regex: /backslash/g,
      replacement: 'invalid\\string'
    }]
  }
}

describe.withBrowsersMatching(supportsFetchExtended)('obfuscate rules', () => {
  it('should apply to all payloads', async () => {
    const spaPromise = browser.testHandle.expectEvents()
    const ajaxPromise = browser.testHandle.expectAjaxEvents()
    const timingsPromise = browser.testHandle.expectTimings()
    const errorsPromise = browser.testHandle.expectErrors()
    const insPromise = browser.testHandle.expectIns()
    const resourcePromise = browser.testHandle.expectResources()
    const rumPromise = browser.testHandle.expectRum()

    await browser.url(await browser.testHandle.assetURL('obfuscate-pii.html', config))
    await browser.waitForAgentLoad()

    const [
      { request: ajaxResponse },
      { request: errorsResponse },
      { request: insResponse },
      { request: resourceResponse },
      { request: spaResponse },
      { request: timingsResponse },
      { request: rumResponse }
    ] = await Promise.all([
      ajaxPromise,
      errorsPromise,
      insPromise,
      resourcePromise,
      spaPromise,
      timingsPromise,
      rumPromise
    ])

    checkPayload(ajaxResponse.body)
    checkPayload(errorsResponse.body)
    checkPayload(insResponse.body)
    checkPayload(resourceResponse.body)
    checkPayload(spaResponse.body)
    checkPayload(timingsResponse.body)
    checkPayload(rumResponse.query) // see harvest.sendRum
    // See harvest.baseQueryString
    checkPayload(errorsResponse.query)
    checkPayload(insResponse.query)
    checkPayload(resourceResponse.query)
    checkPayload(spaResponse.query)
    checkPayload(timingsResponse.query)
  })
})

function checkPayload (payload) {
  expect(payload).toBeDefined() // payload exists

  var strPayload = JSON.stringify(payload)

  expect(strPayload.includes('pii')).toBeFalsy() // pii was obfuscated
  expect(strPayload.includes('bam-test')).toBeFalsy() // bam-test was obfuscated
  expect(strPayload.includes('fakeid')).toBeFalsy() // fakeid was obfuscated
}
