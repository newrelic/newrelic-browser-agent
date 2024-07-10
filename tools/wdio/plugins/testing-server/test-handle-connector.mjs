import logger from '@wdio/logger'
import fetch from 'node-fetch'
import { serialize } from '../../../shared/serializer.js'
import { deepmerge } from 'deepmerge-ts'
import {
  testAjaxEventsRequest, testAjaxTimeSlicesRequest, testCustomMetricsRequest, testErrorsRequest,
  testEventsRequest, testInsRequest, testInteractionEventsRequest, testMetricsRequest, testResourcesRequest,
  testRumRequest, testSupportMetricsRequest,
  testTimingEventsRequest, testBlobRequest, testBlobReplayRequest, testBlobTraceRequest, testSessionReplaySnapshotRequest,
  testInternalErrorsRequest,
  testAnyJseXhrRequest,
  testLogsRequest
} from '../../../testing-server/utils/expect-tests.js'
import defaultAssetQuery from './default-asset-query.mjs'
import { getBrowserName, getBrowserVersion } from '../../../browsers-lists/utils.mjs'
import { NetworkCaptureConnector } from './network-capture-connector.mjs'

const log = logger('testing-server-connector')

/**
 * @typedef {import('../../../testing-server/test-handle.js').TestServerExpect} TestServerExpect
 */

/**
 * Connects a test executing in a child process of WDIO to the testing
 * server running in the root WDIO process for the purposes of creating
 * expects and scheduling replies.
 */
export class TestHandleConnector {
  #assetServerConfig
  #bamServerConfig
  #commandServerConfig
  #commandServerBase
  #testId
  #pendingExpects = new Set()
  #networkCaptures = new Set()

  constructor (assetServerConfig, bamServerConfig, commandServerConfig) {
    this.#assetServerConfig = assetServerConfig
    this.#bamServerConfig = bamServerConfig
    this.#commandServerConfig = commandServerConfig
    this.#commandServerBase = `http://127.0.0.1:${commandServerConfig.port}`
  }

  get assetServerConfig () {
    return this.#assetServerConfig
  }

  get bamServerConfig () {
    return this.#bamServerConfig
  }

  get commandServerBase () {
    return this.#commandServerBase
  }

  get networkCaptures () {
    return Array.from(this.#networkCaptures)
  }

  get testId () {
    return this.#testId
  }

  async ready () {
    if (!this.#testId) {
      const result = await fetch(`${this.#commandServerBase}/test-handle`)

      if (result.status !== 200) {
        log.error(`Scheduling reply failed with status code ${result.status}`, await result.json(), result.error)
        throw new Error('Scheduling reply failed with an unknown result')
      } else {
        this.#testId = (await result.json()).testId
        log.info(`Test ID: ${this.#testId}`)
      }
    }
  }

  /**
   * Destroy all memory references to allow for garbage collection.
   * @returns {void}
   */
  async destroy () {
    this.#pendingExpects.forEach(pendingExpect => pendingExpect.abortController.abort())
    this.#pendingExpects.clear()
    this.#pendingExpects = null

    if (this.#testId) {
      await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}`, {
        method: 'DELETE'
      })
      this.#testId = undefined
    }

    this.#assetServerConfig = null
    this.#bamServerConfig = null
    this.#commandServerConfig = null
    this.#commandServerBase = null

    this.#networkCaptures.clear()
    this.#networkCaptures = null
  }

  // Test Asset URL Construction logic

  /**
   * Calls back to the testing server to create a URL for a specific test asset file
   * within the context of a test handle.
   * @param {string} assetFile the path of the asset to load relative to the repository root
   * @param {object} query key/value pairs of query parameters to apply to the asset url
   * @returns {Promise<string>}
   */
  async assetURL (assetFile, query = {}) {
    await this.ready()
    query.testId = this.#testId
    const result = await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}/asset-url`, {
      method: 'POST',
      body: serialize({
        assetFile,
        query: deepmerge(defaultAssetQuery, query)
      }),
      headers: { 'content-type': 'application/serialized+json' }
    })

    if (result.status !== 200) {
      log.error(`Asset URL retrieval failed with status code ${result.status}`, await result.json(), result.error)
      throw new Error('Asset URL retrieval failed with an unknown result')
    } else {
      return (await result.json()).assetURL
    }
  }

  // Scheduled Replys logic

  /**
   * Schedules a reply to a server request
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {ScheduledReply} scheduledReply The reply options to apply to the server request
   */
  async scheduleReply (serverId, scheduledReply) {
    const result = await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}/scheduleReply`, {
      method: 'POST',
      body: serialize({
        serverId,
        scheduledReply: { ...scheduledReply, test: scheduledReply.test }
      }),
      headers: { 'content-type': 'application/serialized+json' }
    })

    if (result.status !== 200) {
      log.error(`Scheduling reply failed with status code ${result.status}`, await result.json(), result.error)
      throw new Error('Scheduling reply failed with an unknown result')
    }
  }

  /**
   * Clears all scheduled replies for the given server.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   */
  async clearScheduledReplies (serverId) {
    const result = await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}/clearScheduledReplies`, {
      method: 'POST',
      body: serialize({
        serverId
      }),
      headers: { 'content-type': 'application/serialized+json' }
    })

    if (result.status !== 200) {
      log.error(`Clearing scheduled reply failed with status code ${result.status}`, await result.json(), result.error)
      throw new Error('Clearing scheduled reply failed with an unknown result')
    }
  }

  // Network Captures logic

  /**
   * Creates a network capture instance for the specified server that will capture matching network
   * requests allowing tests to check which BAM APIs or assets were requested, how many times, and
   * wait for some expectation within the capture to pause testing.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {import('../../../testing-server/network-capture').NetworkCaptureOptions|import('../../../testing-server/network-capture').NetworkCaptureOptions[]} networkCaptureOptions The options to apply
   * to the server request to verify if the request should be captured
   * @returns {import('./network-capture-connector.mjs').NetworkCaptureConnector|import('./network-capture-connector.mjs').NetworkCaptureConnector[]} The network capture connector instance with the
   * remaining APIs for interfacing with the network capture on the test server
   */
  async createNetworkCaptures (serverId, networkCaptureOptions) {
    const result = await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}/network-capture/${serverId}`, {
      method: 'POST',
      body: serialize(
        Array.isArray(networkCaptureOptions)
          ? networkCaptureOptions
          : [networkCaptureOptions]
      ),
      headers: { 'content-type': 'application/serialized+json' }
    })

    if (result.status !== 200) {
      log.error(`Creating network capture(s) failed with status code ${result.status}`, await result.json(), result.error)
      throw new Error('Creating network capture(s) failed with an unknown result')
    } else {
      const networkCaptureIds = await result.json()
      log.info(`Network Capture ID(s): ${networkCaptureIds}`)

      if (!Array.isArray(networkCaptureOptions)) {
        const networkCapture = new NetworkCaptureConnector(this, serverId, networkCaptureIds[0])
        this.#networkCaptures.add(networkCapture)
        return networkCapture
      } else {
        return networkCaptureIds.map(id => {
          const networkCapture = new NetworkCaptureConnector(this, serverId, id)
          this.#networkCaptures.add(networkCapture)
          return networkCapture
        })
      }
    }
  }

  // Deprecated Expects logic

  /**
   * Calls back to the testing server to create an expect for a specific server with a given test
   * function. The test can await the network call to resolve or reject to know if the expected
   * request was received.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {TestServerExpect} testServerExpect The expect options to apply to the server request
   * @returns {Promise<*>} Promise to await for the server request
   */
  async expect (serverId, testServerExpect) {
    await this.ready()

    const abortController = new AbortController()
    const expectRequest = fetch(`${this.#commandServerBase}/test-handle/${this.#testId}/expect`, {
      method: 'POST',
      body: serialize({
        serverId,
        expectOpts: {
          timeout: testServerExpect.timeout,
          test: testServerExpect.test,
          expectTimeout: testServerExpect.expectTimeout
        }
      }),
      headers: { 'content-type': 'application/serialized+json' },
      signal: abortController.signal
    })

    const pendingExpect = { abortController, expectRequest }
    this.#pendingExpects.add(pendingExpect)

    try {
      const result = await expectRequest

      if (result.status !== 200) {
        log.error(`Expect failed with status code ${result.status}`, await result.json(), getBrowserName(browser.capabilities), getBrowserVersion(browser.capabilities))

        if (testServerExpect.expectTimeout) {
          throw new Error('Unexpected network call seen')
        } else {
          throw new Error('Expect failed with an unknown result')
        }
      } else if (testServerExpect.expectTimeout) {
        // eslint-disable-next-line
        return
      } else {
        return await result.json()
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        throw err
      }
    } finally {
      this.#pendingExpects.delete(pendingExpect)
    }
  }

  /* ***** BAM Expect Shortcut Methods ***** */

  expectRum (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testRumRequest,
      expectTimeout
    })
  }

  expectEvents (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testEventsRequest,
      expectTimeout
    })
  }

  expectTimings (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testTimingEventsRequest,
      expectTimeout
    })
  }

  expectFinalTimings (timeout, expectTimeout = false) {
    return Promise.all([ // EoL harvest can actually happen twice on navigation away -- typically when there's an CLS update/node
      this.expect('bamServer', {
        timeout,
        test: testTimingEventsRequest,
        expectTimeout
      }),
      this.expect('bamServer', {
        timeout,
        test: testTimingEventsRequest,
        expectTimeout
      })
    ]).then(([firstHarvest, secondHarvest]) => {
      firstHarvest.request.body.push(...secondHarvest.request.body)
      return firstHarvest
    })
  }

  expectAjaxEvents (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testAjaxEventsRequest,
      expectTimeout
    })
  }

  expectInteractionEvents (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testInteractionEventsRequest,
      expectTimeout
    })
  }

  expectMetrics (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testMetricsRequest,
      expectTimeout
    })
  }

  expectSupportMetrics (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testSupportMetricsRequest,
      expectTimeout
    })
  }

  expectCustomMetrics (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testCustomMetricsRequest,
      expectTimeout
    })
  }

  expectErrors (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testErrorsRequest,
      expectTimeout
    })
  }

  expectAnyJseXhr (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testAnyJseXhrRequest,
      expectTimeout
    })
  }

  expectInternalErrors (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testInternalErrorsRequest,
      expectTimeout
    })
  }

  expectAjaxTimeSlices (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testAjaxTimeSlicesRequest,
      expectTimeout
    })
  }

  expectIns (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testInsRequest,
      expectTimeout
    })
  }

  expectResources (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testResourcesRequest,
      expectTimeout
    })
  }

  expectLogs (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testLogsRequest,
      expectTimeout
    })
  }

  expectBlob (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testBlobRequest,
      expectTimeout
    })
  }

  expectReplay (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testBlobReplayRequest,
      expectTimeout
    })
  }

  expectTrace (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testBlobTraceRequest,
      expectTimeout
    })
  }

  expectSessionReplaySnapshot (timeout, expectTimeout = false) {
    return this.expect('bamServer', {
      timeout,
      test: testSessionReplaySnapshotRequest,
      expectTimeout
    })
  }
}
