import logger from '@wdio/logger'
import fetch from 'node-fetch'
import * as SerAny from 'serialize-anything'
import {
  testAjaxEventsRequest, testAjaxTimeSlicesRequest, testCustomMetricsRequest, testErrorsRequest,
  testEventsRequest, testInsRequest, testInteractionEventsRequest, testMetricsRequest, testResourcesRequest,
  testRumRequest, testSupportMetricsRequest,
  testTimingEventsRequest
} from '../../../testing-server/utils/expect-tests.js'

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
  #commandServerBase
  #testId
  #pendingExpects = new Set()

  constructor (commandServerPort) {
    this.#commandServerBase = `http://127.0.0.1:${commandServerPort}`
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
      body: JSON.stringify({
        serverId,
        expectOpts: {
          timeout: testServerExpect.timeout,
          test: SerAny.serialize(testServerExpect.test),
          expectTimeout: testServerExpect.expectTimeout
        }
      }),
      headers: { 'content-type': 'application/json' },
      signal: abortController.signal
    })

    const pendingExpect = { abortController, expectRequest }
    this.#pendingExpects.add(pendingExpect)

    try {
      const result = await expectRequest

      if (result.status !== 200) {
        log.error(`Expect failed with status code ${result.status}`, await result.json(), result.error)

        if (testServerExpect.expectTimeout) {
          throw new Error('Unexpected network call seen')
        } else {
          throw new Error('Expect failed with an unknown result')
        }
      } else if (testServerExpect.expectTimeout) {
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
}
