import fetch from 'node-fetch'
import { serialize } from '../../../shared/serializer.js'

export class NetworkCaptureConnector {
  /**
   * Base URL for network capture API calls.
   */
  #networkCaptureBase

  /**
   * Creates a new instance of a network capture connector.
   * @param {import('./test-handle-connector.mjs').TestHandleConnector} testHandleConnector
   * @param {'assetServer'|'bamServer'} serverId
   */
  constructor (testHandleConnector, serverId, captureId) {
    this.#networkCaptureBase = `${testHandleConnector.commandServerBase}/test-handle/${testHandleConnector.testId}/network-capture/${serverId}/${captureId}`
  }

  /**
   * Gets and returns the current data for this network capture
   * @returns {Promise<import('../../../testing-server/network-capture.mjs').SerializedNetworkCapture[]>} Array of serialized network captures
   */
  async getCurrentResults () {
    const result = await fetch(this.#networkCaptureBase)
    return await result.json()
  }

  /**
   * Clears any stored data for this network capture
   * @returns {Promise<void>}
   */
  async clearResults () {
    await fetch(`${this.#networkCaptureBase}/clear`, {
      method: 'PUT'
    })
  }

  /**
   * Destroys this network capture on the testing server to release memory for garbage collection
   * @returns {Promise<void>}
   */
  async destroy () {
    await fetch(this.#networkCaptureBase, {
      method: 'DELETE'
    })

    this.#networkCaptureBase = null
  }

  /**
   * Pauses test execution until the network condition on the testing server meets the supplied conditions
   * @param {import('../../../testing-server/network-capture.mjs').NetworkCaptureWaitConditions} waitConditions Conditions to pause execution
   * @returns {Promise<import('../../../testing-server/network-capture.mjs').SerializedNetworkCapture[]>} Array of serialized network captures
   */
  async waitForResult (waitConditions) {
    const result = await fetch(`${this.#networkCaptureBase}/await`, {
      method: 'POST',
      body: serialize(waitConditions),
      headers: { 'content-type': 'application/serialized+json' }
    })
    return await result.json()
  }
}
