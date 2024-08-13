import { supportsFetchExtended } from '../../tools/browser-matcher/common-matchers.mjs'
import { testAjaxEventsRequest, testBlobTraceRequest, testErrorsRequest, testInsRequest, testInteractionEventsRequest, testRumRequest, testTimingEventsRequest } from '../../tools/testing-server/utils/expect-tests'

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
  let rumCapture
  let timingEventsCapture
  let ajaxEventsCapture
  let errorsCapture
  let insightsCapture
  let tracesCapture
  let interactionEventsCapture

  beforeEach(async () => {
    [rumCapture, timingEventsCapture, ajaxEventsCapture, errorsCapture, insightsCapture, tracesCapture, interactionEventsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testTimingEventsRequest },
      { test: testAjaxEventsRequest },
      { test: testErrorsRequest },
      { test: testInsRequest },
      { test: testBlobTraceRequest },
      { test: testInteractionEventsRequest }
    ])
  })

  it('should apply to all payloads', async () => {
    const [rumHarvests, timingEventsHarvests, ajaxEventsHarvests, errorsHarvests, insightsHarvests, tracesHarvests, interactionEventsHarvests] = await Promise.all([
      rumCapture.waitForResult({ timeout: 10000 }),
      timingEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      errorsCapture.waitForResult({ timeout: 10000 }),
      insightsCapture.waitForResult({ timeout: 10000 }),
      tracesCapture.waitForResult({ timeout: 10000 }),
      interactionEventsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('obfuscate-pii.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    rumHarvests.forEach(harvest => checkPayload(harvest.request.query))
    timingEventsHarvests.forEach(harvest => {
      checkPayload(harvest.request.body)
      checkPayload(harvest.request.query)
    })
    ajaxEventsHarvests.forEach(harvest => checkPayload(harvest.request.body))
    errorsHarvests.forEach(harvest => {
      checkPayload(harvest.request.body)
      checkPayload(harvest.request.query)
    })
    insightsHarvests.forEach(harvest => {
      checkPayload(harvest.request.body)
      checkPayload(harvest.request.query)
    })
    tracesHarvests.forEach(harvest => {
      console.log(JSON.stringify(harvest.request.body))
      checkPayload(harvest.request.body)
      checkPayload(harvest.request.query)
    })
    interactionEventsHarvests.forEach(harvest => {
      checkPayload(harvest.request.body)
      checkPayload(harvest.request.query)
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
