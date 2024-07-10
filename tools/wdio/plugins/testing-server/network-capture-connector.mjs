import logger from '@wdio/logger'
import fetch from 'node-fetch'
import { serialize } from '../../../shared/serializer.js'

const log = logger('network-capture-connector')

export class NetworkCaptureConnector {
  /**
   * Base URL for network capture API calls.
   */
  #networkCaptureBase

  #awaitingResults = 0

  /**
   * Creates a new instance of a network capture connector.
   * @param {import('./test-handle-connector.mjs').TestHandleConnector} testHandleConnector
   * @param {'assetServer'|'bamServer'} serverId
   */
  constructor (testHandleConnector, serverId, captureId) {
    this.#networkCaptureBase = `${testHandleConnector.commandServerBase}/test-handle/${testHandleConnector.testId}/network-capture/${serverId}/${captureId}`
  }

  /**
   * Boolean indicating if this network capture has any await results calls pending.
   * @returns {boolean}
   */
  get awaitingResults () {
    return this.#awaitingResults > 0
  }

  /**
   * Gets and returns the current data for this network capture
   * @returns {Promise<import('../../../testing-server/network-capture.mjs').SerializedNetworkCapture[]>} Array of serialized network captures
   */
  async getCurrentResults () {
    const result = await fetch(this.#networkCaptureBase)

    if (result.status !== 200) {
      log.error(`Getting current results for network capture failed with status code ${result.status}`, await result.json(), result.error)
      throw new Error('Getting current results for network capture failed with an unknown result')
    } else {
      return await result.json()
    }
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
    this.#awaitingResults++
    const result = await fetch(`${this.#networkCaptureBase}/await`, {
      method: 'POST',
      body: serialize(waitConditions),
      headers: { 'content-type': 'application/serialized+json' }
    })
    this.#awaitingResults--

    if (result.status !== 200) {
      log.error(`Waiting for network capture results failed with status code ${result.status}`, await result.json(), result.error)
      throw new Error('Waiting for network capture results failed with an unknown result')
    } else {
      return await result.json()
    }
  }
}
