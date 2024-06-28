import logger from '@wdio/logger'
import fetch from 'node-fetch'
import { serialize } from '../../../shared/serializer.js'

const log = logger('network-capture-connector')

export class NetworkCaptureConnector {
  /**
   * Base URL for network capture API calls.
   */
  #networkCaptureBase

  /**
   * Id of the server this network capture connector instance is related to.
   * This is used to execute additional APIs for the specific network capture
   * instance.
   * @type {'assetServer'|'bamServer'}
   */
  #serverId

  /**
   * The options to apply to the server request to verify if the request should
   * be captured.
   * @type {import('../../../testing-server/network-capture.js').NetworkCaptureOptions}
   */
  #networkCaptureOptions

  /**
   * The unique id of the network capture that was created in the test server.
   * This is used to execute additional APIs for the specific network capture
   * instance.
   * @type {string}
   */
  #captureId

  /**
   * Creates a new instance of a network capture connector.
   * @param {import('./test-handle-connector.mjs').TestHandleConnector} testHandleConnector
   * @param {'assetServer'|'bamServer'} serverId
   */
  constructor (testHandleConnector, serverId, networkCaptureOptions) {
    this.#serverId = serverId
    this.#networkCaptureBase = `${testHandleConnector.commandServerBase}/test-handle/${testHandleConnector.testId}/network-capture`
    this.#networkCaptureOptions = networkCaptureOptions
  }

  async ready () {
    if (!this.#captureId) {
      const result = await fetch(`${this.#networkCaptureBase}/${this.#serverId}`, {
        method: 'POST',
        body: serialize(this.#networkCaptureOptions),
        headers: { 'content-type': 'application/serialized+json' }
      })
      this.#captureId = (await result.json()).captureId
      log.info(`Network Capture ID: ${this.#captureId}`)
    }
  }

  /**
   * Gets and returns the current data for this network capture
   * @returns {Promise<import('../../../testing-server/network-capture.mjs').SerializedNetworkCapture[]>} Array of serialized network captures
   */
  async getCurrentResults () {
    const result = await fetch(`${this.#networkCaptureBase}/${this.#serverId}/${this.#captureId}`)
    return await result.json()
  }

  /**
   * Clears any stored data for this network capture
   * @returns {Promise<void>}
   */
  async clearResults () {
    await fetch(`${this.#networkCaptureBase}/${this.#serverId}/${this.#captureId}/clear`, {
      method: 'PUT'
    })
  }

  /**
   * Destroys this network capture on the testing server to release memory for garbage collection
   * @returns {Promise<void>}
   */
  async destroy () {
    await fetch(`${this.#networkCaptureBase}/${this.#serverId}/${this.#captureId}`, {
      method: 'DELETE'
    })

    this.#captureId = null
    this.#networkCaptureOptions = null
    this.#serverId = null
    this.#networkCaptureBase = null
  }

  /**
   * Pauses test execution until the network condition on the testing server meets the supplied conditions
   * @param {import('../../../testing-server/network-capture.mjs').NetworkCaptureWaitConditions} waitConditions Conditions to pause execution
   * @returns {Promise<import('../../../testing-server/network-capture.mjs').SerializedNetworkCapture[]>} Array of serialized network captures
   */
  async waitForResult (waitConditions) {
    const result = await fetch(`${this.#networkCaptureBase}/${this.#serverId}/${this.#captureId}/await`, {
      method: 'POST',
      body: serialize(waitConditions),
      headers: { 'content-type': 'application/serialized+json' }
    })
    return await result.json()
  }
}
