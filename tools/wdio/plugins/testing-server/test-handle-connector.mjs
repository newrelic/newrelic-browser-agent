import logger from '@wdio/logger'
import fetch from 'node-fetch'
import * as SerAny from 'serialize-anything'
import {
  testAjaxEventsRequest, testAjaxTimeSlicesRequest, testCustomMetricsRequest, testErrorsRequest,
  testEventsRequest, testInsRequest, testInteractionEventsRequest, testMetricsRequest, testResourcesRequest,
  testRumRequest, testSupportMetricsRequest,
  testTimingEventsRequest
} from '../../../testing-server/utils/expect-tests.js'

const log = logger('jil-testing-server-connector')

/**
 * Connects a test executing in a child process of WDIO to the testing
 * server running in the root WDIO process for the purposes of creating
 * expects and scheduling replies.
 */
export class TestHandleConnector {
  #commandServerBase
  #testId

  constructor (commandServerPort) {
    this.#commandServerBase = `http://localhost:${commandServerPort}`
  }

  async ready () {
    if (!this.#testId) {
      const result = await fetch(`${this.#commandServerBase}/test-handle`)
      this.#testId = (await result.json()).testId
      log.info(`Test ID: ${this.#testId}`)
    }
  }

  async destroy () {
    if (this.#testId) {
      await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}`, {
        method: 'DELETE'
      })
      this.#testId = undefined
    }
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
    await this.ready()

    const result = await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}/expect`, {
      method: 'POST',
      body: JSON.stringify({
        serverId,
        expectOpts: {
          timeout: testServerExpect.timeout,
          test: SerAny.serialize(testServerExpect.test)
        }
      }),
      headers: { 'content-type': 'application/json' }
    })

    if (result.status !== 200) {
      log.error(`Expect failed with status code ${result.status}`, await result.json(), result.error)
      throw new Error('Expect failed with an unknown result')
    } else {
      return await result.json()
    }
  }

  /**
   * Calls back to the testing server to create a URL for a specific test asset file
   * within the context of a test handle.
   * @param {string} assetFile
   * @param {object} query
   * @returns {Promise<string>}
   */
  async assetURL (assetFile, query = {}) {
    await this.ready()

    const result = await fetch(`${this.#commandServerBase}/test-handle/${this.#testId}/asset-url`, {
      method: 'POST',
      body: JSON.stringify({
        assetFile,
        query
      }),
      headers: { 'content-type': 'application/json' }
    })

    if (result.status !== 200) {
      log.error(`Asset URL retrieval failed with status code ${result.status}`, await result.json(), result.error)
      throw new Error('Asset URL retrieval failed with an unknown result')
    } else {
      return (await result.json()).assetURL
    }
  }

  /****** BAM Expect Shortcut Methods ******/

  expectRum (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testRumRequest
    })
  }

  expectEvents (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testEventsRequest
    })
  }

  expectTimings (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testTimingEventsRequest
    })
  }

  expectAjaxEvents (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testAjaxEventsRequest
    })
  }

  expectInteractionEvents (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testInteractionEventsRequest
    })
  }

  expectMetrics (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testMetricsRequest
    })
  }

  expectSupportMetrics (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testSupportMetricsRequest
    })
  }

  expectCustomMetrics (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testCustomMetricsRequest
    })
  }

  expectErrors (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testErrorsRequest
    })
  }

  expectAjaxTimeSlices (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testAjaxTimeSlicesRequest
    })
  }

  expectIns (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testInsRequest
    })
  }

  expectResources (timeout) {
    return this.expect('bamServer', {
      timeout,
      test: testResourcesRequest
    })
  }
}
