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
  testAnyJseXhrRequest
} from '../../../testing-server/utils/expect-tests.js'
import defaultAssetQuery from './default-asset-query.mjs'
import { getBrowserName, getBrowserVersion } from '../../../browsers-lists/utils.mjs'

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

  get commandServerConfig () {
    return this.#commandServerConfig
  }

  get testId () {
    return this.#testId
  }

  async ready () {
    if (!this.#testId) {
      const result = await fetch(`${this.#commandServerBase}/test-handle`)
      this.#testId = (await result.json()).testId
      log.info(`Test ID: ${this.#testId}`)
    }
  }

  async destroy () {
    this.#pendingExpects.forEach(pendingExpect => pendingExpect.abortController.abort())

    if (this.#testId) {
      await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}`, {
        method: 'DELETE'
      })
      this.#testId = undefined
    }
  }

  /**
   * Retrieves information about the number and type of requests the testing server
   * has seen.
   */
  async getRequestCounts () {
    const result = await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}/requestCounts`, {
      method: 'POST'
    })
    return await result.json()
  }

  /**
   * Schedules a reply to a server request
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {ScheduledReply} scheduledReply The reply options to apply to the server request
   */
  async scheduleReply (serverId, scheduledReply) {
    await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}/scheduleReply`, {
      method: 'POST',
      body: serialize({
        serverId,
        scheduledReply: { ...scheduledReply, test: scheduledReply.test }
      }),
      headers: { 'content-type': 'application/serialized+json' }
    })
  }

  /**
   * Clears all scheduled replies for the given server.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   */
  async clearScheduledReplies (serverId) {
    await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}/clearScheduledReplies`, {
      method: 'POST',
      body: serialize({
        serverId
      }),
      headers: { 'content-type': 'application/serialized+json' }
    })
  }

  /**
   * Calls back to the testing server to create an expect for a specific server with a given test
   * function. The test can await the network call to resolve or reject to know if the expected
   * request was received.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {TestServerExpect} testServerExpect The expect options to apply to the server request
   * @returns {Promise<*>} Promise to await for the server request
   */
  async expect (serverId, testServerExpect) {
    if (testServerExpect.timePeriod) return this.expectOverTimePeriod(serverId, testServerExpect)
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

  /**
      * Calls back to the testing server endlessly to create an expect for a specific server with a given test
   * function until a time limit is reached. It returns an array of the response payloads. The test can await the network call(s) to resolve or reject to know if the expected
   * request was received.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {TestServerExpect} testServerExpect The expect options to apply to the server request
   * @returns {Promise<*[]>} Promise to await for the server request
   */
  expectOverTimePeriod (serverId, testServerExpect) {
    return new Promise((resolve, reject) => {
      let done = false
      const data = []
      const waitForExpect = async (data = []) => {
        if (done) return // time's up, dont continue (race)
        if (data.length >= testServerExpect.expectedPayloadCount) return // got as many payloads as we expected already... dont continue
        const expectedData = await this.expect(serverId, testServerExpect)
        if (!expectedData) return // expect timed out, dont continue
        if (data.length >= testServerExpect.expectedPayloadCount) return // got as many payloads as we expected already (may have happened async from above check)... dont continue
        data.push(expectedData)
        await waitForExpect(data)
      }
      const finish = () => {
        if (!this.done) {
          this.done = true
          resolve(data)
        }
      }
      setTimeout(finish, testServerExpect.timePeriod)
      delete testServerExpect.timePeriod
      /** set up two expect listeners to make sure theres no sequential race pattern */
      Promise.all([
        waitForExpect(data),
        waitForExpect(data)
      ]).then(finish)
    })
  }

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

  /* ***** BAM Expect Shortcut Methods ***** */

  expectRum (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testRumRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectEvents (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testEventsRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectTimings (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testTimingEventsRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectAjaxEvents (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testAjaxEventsRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectInteractionEvents (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testInteractionEventsRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectMetrics (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testMetricsRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectSupportMetrics (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testSupportMetricsRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectCustomMetrics (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testCustomMetricsRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectErrors (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testErrorsRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectAnyJseXhr (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testAnyJseXhrRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectInternalErrors (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testInternalErrorsRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectAjaxTimeSlices (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testAjaxTimeSlicesRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectIns (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testInsRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectResources (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testResourcesRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectBlob (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testBlobRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectReplay (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testBlobReplayRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectTrace (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testBlobTraceRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }

  expectSessionReplaySnapshot (timeout, expectTimeout = false, timePeriod = undefined, expectedPayloadCount = Infinity) {
    return this.expect('bamServer', {
      timeout,
      test: testSessionReplaySnapshotRequest,
      expectTimeout,
      timePeriod,
      expectedPayloadCount
    })
  }
}
