import { supportsFetchExtended } from '../../tools/browser-matcher/common-matchers.mjs'

describe('obfuscate rules', () => {
  withBrowsersMatching(supportsFetchExtended)('should apply to all payloads', async () => {
    const spaPromise = browser.testHandle.expectEvents()
    const ajaxPromise = browser.testHandle.expectAjaxEvents()
    const timingsPromise = browser.testHandle.expectTimings()
    const errorsPromise = browser.testHandle.expectErrors()
    const insPromise = browser.testHandle.expectIns()
    const resourcePromise = browser.testHandle.expectResources()
    const rumPromise = browser.testHandle.expectRum()

    const config = {
      loader: 'spa',
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
        }],
        ajax: {
          harvestTimeSeconds: 2,
          enabled: true
        },
        jserrors: {
          harvestTimeSeconds: 2
        },
        ins: {
          harvestTimeSeconds: 2
        }
      }
    }

    await browser.url(await browser.testHandle.assetURL('obfuscate-pii.html', config))
      .then(() => browser.waitForAgentLoad())

    await Promise.all([
      ajaxPromise,
      errorsPromise,
      insPromise,
      resourcePromise,
      spaPromise,
      timingsPromise,
      rumPromise
    ]).then(([
      { request: ajaxResponse },
      { request: errorsResponse },
      { request: insResponse },
      { request: resourceResponse },
      { request: spaResponse },
      { request: timingsResponse },
      { request: rumResponse }
    ]) => {
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
})

function checkPayload (payload) {
  expect(payload).toBeDefined() // payload exists

  var strPayload = JSON.stringify(payload)

  expect(strPayload.includes('pii')).toBeFalsy() // pii was obfuscated
  expect(strPayload.includes('bam-test')).toBeFalsy() // bam-test was obfuscated
  expect(strPayload.includes('fakeid')).toBeFalsy() // fakeid was obfuscated
}
