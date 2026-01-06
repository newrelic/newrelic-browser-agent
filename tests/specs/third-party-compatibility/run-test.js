import { testAjaxTimeSlicesRequest, testBlobTraceRequest, testInteractionEventsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

/**
 * A callback to run after the page has loaded
 * @typedef {function} AfterLoadCallback
 * @param {object} captures
 * @param {import('../../../tools/wdio/plugins/testing-server/network-capture-connector.mjs').NetworkCaptureConnector} captures.rumCapture
 * @param {import('../../../tools/wdio/plugins/testing-server/network-capture-connector.mjs').NetworkCaptureConnector} captures.tracesCapture
 * @param {import('../../../tools/wdio/plugins/testing-server/network-capture-connector.mjs').NetworkCaptureConnector} captures.interactionCapture
 * @param {import('../../../tools/wdio/plugins/testing-server/network-capture-connector.mjs').NetworkCaptureConnector} captures.ajaxMetricsCapture
 * @param {object} harvests
 * @param {import('../../../tools/testing-server/network-capture.mjs').SerializedNetworkCapture[]} harvests.rumHarvests
 * @param {import('../../../tools/testing-server/network-capture.mjs').SerializedNetworkCapture[]} harvests.tracesHarvests
 * @param {import('../../../tools/testing-server/network-capture.mjs').SerializedNetworkCapture[]} harvests.interactionHarvests
 * @param {import('../../../tools/testing-server/network-capture.mjs').SerializedNetworkCapture[]} harvests.ajaxMetricsHarvests
 */

/**
 * Executes a standard set of tests for third-party compatibility.
 * @param browser {WebdriverIO.Browser} The wdio browser instance
 * @param testAsset {string} The path to the test asset
 * @param afterLoadCallback {AfterLoadCallback} A callback to run after the page has loaded
 * @returns {Promise<void>}
 */
export default async function runTest ({
  browser,
  testAsset,
  afterLoadCallback = () => { /* noop */ }
}) {
  const [rumCapture, tracesCapture, interactionCapture, ajaxMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
    { test: testRumRequest },
    { test: testBlobTraceRequest },
    { test: testInteractionEventsRequest },
    { test: testAjaxTimeSlicesRequest }
  ])
  const url = await browser.testHandle.assetURL(testAsset)

  const [rumHarvests, tracesHarvests, interactionHarvests, ajaxMetricsHarvests] = await Promise.all([
    rumCapture.waitForResult({ totalCount: 1 }),
    tracesCapture.waitForResult({ totalCount: 1 }),
    interactionCapture.waitForResult({ totalCount: 1 }),
    ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
    browser.url(url)
      .then(() => browser.waitForAgentLoad())
  ])

  expect(rumHarvests[0].request.query.a).toEqual(expect.any(String))
  expect(rumHarvests[0].request.query.a.length).toBeGreaterThan(0)
  expect(rumHarvests[0].request.query.ref).toEqual(url.split('?')[0])

  expect(Array.isArray(tracesHarvests[0].request.body)).toEqual(true)
  expect(tracesHarvests[0].request.body.length).toBeGreaterThan(0)

  expect(Array.isArray(interactionHarvests[0].request.body)).toEqual(true)
  expect(interactionHarvests[0].request.body.length).toEqual(1)
  expect(interactionHarvests[0].request.body[0].trigger).toEqual('initialPageLoad')

  expect(Array.isArray(ajaxMetricsHarvests[0].request.body.xhr)).toEqual(true)
  expect(Array.isArray(ajaxMetricsHarvests[0].request.body.err)).toEqual(false)
  expect(ajaxMetricsHarvests[0].request.body.xhr.length).toBeGreaterThan(0)

  await afterLoadCallback(
    {
      rumCapture,
      tracesCapture,
      interactionCapture,
      ajaxMetricsCapture
    },
    {
      rumHarvests,
      tracesHarvests,
      interactionHarvests,
      ajaxMetricsHarvests
    }
  )
}
