const { v4: uuidV4 } = require('uuid')
const { paths } = require('./constants')
const { urlFor } = require('./utils/url')
const path = require('path')
const { deepmerge } = require('deepmerge-ts')
const NetworkCapture = require('./network-capture')

/**
 * Scheduled reply options
 * @typedef {object} ScheduledReply
 * @property {string} [id] unique identifier for the scheduled reply, can be used to clear the reply
 * @property {Function|string} test function that takes the fastify request object and returns true if the scheduled
 * response should be applied
 * @property {boolean} permanent indicates if the reply should be left in place
 * @property {number} statusCode response code
 * @property {string} body response body
 * @property {number} delay delay the response by a number of milliseconds
 * @property {string[]} removeHeaders list of headers to remove from the response
 * @property {{ key: string, value: string }[]} setHeaders list of key:value pairs to add as headers to the response
 */

module.exports = class TestHandle {
  /**
   * @type TestServer
   */
  #testServer

  /**
   * @type string
   */
  #testId

  /**
   * List of scheduled replies keyed to a server id {'assetServer'|'bamServer'}
   * @type {Map<string, Set<ScheduledReply>>}
   */
  #scheduledReplies = new Map()

  /**
   * List of network capture instances keyed to a server id {'assetServer'|'bamServer'}
   * @type {Map<string, Map<string, import('./network-capture')>>}
   */
  #networkCaptures = new Map()

  constructor (testServer, testId) {
    this.#testServer = testServer
    this.#testId = testId || uuidV4()
  }

  get testId () {
    return this.#testId
  }

  /**
   * Destroy all memory references to allow for garbage collection.
   * @returns {void}
   */
  destroy () {
    this.#scheduledReplies.clear()
    this.#scheduledReplies = null

    for (const networkCaptureMap of this.#networkCaptures.values()) {
      for (const networkCapture of networkCaptureMap.values()) {
        networkCapture.destroy()
      }
      networkCaptureMap.clear()
    }
    this.#networkCaptures.clear()
    this.#networkCaptures = null

    this.#testServer = null
    this.#testId = null
  }

  /**
   * Processes an incoming request for scheduled responses and pending expects
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request was received on
   * @param {import('fastify').FastifyInstance} fastify fastify server the request was received on
   * @param {import('fastify').FastifyRequest} request the incoming request
   */
  processRequest (serverId, fastify, request) {
    // Scheduled Replys logic
    if (this.#scheduledReplies.has(serverId + this.testId)) {
      const scheduledReplies = this.#scheduledReplies.get(serverId + this.testId)

      for (const scheduledReply of scheduledReplies) {
        try {
          let test = scheduledReply.test

          if (test.call(this, request)) {
            request.scheduledReply = scheduledReply

            if (!scheduledReply.permanent) {
              scheduledReplies.delete(scheduledReply)
            }
            break
          }
        } catch (e) {
          fastify.log.error(e)
          if (!scheduledReply.permanent) {
            scheduledReplies.delete(scheduledReply)
          }
        }
      }
    }

    // Network Captures logic
    if (this.#networkCaptures.has(serverId + this.testId)) {
      const networkCaptures = this.#networkCaptures.get(serverId + this.testId)

      for (const networkCapture of networkCaptures.values()) {
        try {
          if (networkCapture.test(request)) {
            request.networkCaptures.add(networkCapture)
          }
        } catch (e) {
          fastify.log.error(e)
        }
      }
    }
  }

  // Test Asset URL Construction logic

  /**
   * Constructs a URL for a test asset relative to the current testId
   * @param {string} assetFile - A path to a file or a directory containing an index.html file.
   * @param {object} query
   * @returns {string}
   */
  assetURL (assetFile, query = {}) {
    let relativePath = path.relative(
      paths.rootDir,
      path.resolve(paths.testsAssetsDir, assetFile)
    )
    if (assetFile.slice(-1) === '/') relativePath += '/'
    return urlFor(
      relativePath,
      assetFile === '/'
        ? undefined
        : deepmerge(
          {
            loader: 'full',
            config: {
              licenseKey: this.#testId
            },
            init: { ajax: { block_internal: false } }
          },
          query
        ),
      this.#testServer
    )
  }

  // Scheduled Replys logic

  /**
   * Schedules a reply to a server request
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {ScheduledReply} scheduledReply The reply options to apply to the server request
   */
  scheduleReply (serverId, scheduledReply) {
    if (!this.#scheduledReplies.has(serverId + this.testId)) {
      this.#scheduledReplies.set(serverId + this.testId, new Set())
    }

    this.#scheduledReplies.get(serverId + this.testId).add(scheduledReply)
  }

  /**
   * Deletes one or more scheduled replies for the given server by the scheduled reply test function name.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {ScheduledReply} scheduledReply The reply options to apply to the server request, only needs to include
   * the test function
   */
  clearScheduledReply (serverId, scheduledReply) {
    if (!this.#scheduledReplies.has(serverId + this.testId)) {
      return
    }

    this.#scheduledReplies.get(serverId + this.testId).forEach(reply => {
      if (scheduledReply.test.name === reply.test.name) {
        this.#scheduledReplies.get(serverId + this.testId).delete(reply)
      }
    })
  }

  /**
   * Clears the scheduled replies for a server
   * @param {'assetServer'|'bamServer'} serverId Id of the server to clear
   */
  clearScheduledReplies (serverId) {
    this.#scheduledReplies.set(serverId + this.testId, new Set())
  }

  // Network Captures logic

  /**
   * Creates a network capture instance for the specified server that will capture matching network
   * requests allowing tests to check which BAM APIs or assets were requested, how many times, and
   * wait for some expectation within the capture to pause testing.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {import('./network-capture').NetworkCaptureOptions[]} networkCaptureOptions The options to apply
   * to the server request to verify if the request should be captured
   * @returns {import('./network-capture')} The ID of the network capture
   */
  createNetworkCaptures (serverId, networkCaptureOptions) {
    if (!this.#networkCaptures.has(serverId + this.testId)) {
      this.#networkCaptures.set(serverId + this.testId, new Map())
    }

    return networkCaptureOptions
      .map(options => {
        const networkCapture = new NetworkCapture(this, options)
        this.#networkCaptures.get(serverId + this.testId).set(networkCapture.instanceId, networkCapture)
        return networkCapture.instanceId
      })
  }

  /**
   * Verifies the network capture exists for the supplied server id and returns the network captures
   * current cache of captures as an array of serialized data.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the network capture was created for
   * @param {string} captureId The unique id of the network capture
   * @returns {import('./network-capture').SerializedNetworkCapture[]} Array of serialized network captures
   */
  getNetworkCaptureCache (serverId, captureId) {
    const networkCaptures = this.#networkCaptures.get(serverId + this.testId)

    if (!networkCaptures || !networkCaptures.has(captureId)) {
      return []
    }

    return networkCaptures.get(captureId).captures
  }

  /**
   * Verifies the network capture exists for the supplied server id and clears it's current network capture cache.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the network capture was created for
   * @param {string} captureId The unique id of the network capture
   * @returns {void}
   */
  clearNetworkCaptureCache (serverId, captureId) {
    const networkCaptures = this.#networkCaptures.get(serverId + this.testId)

    if (!networkCaptures || !networkCaptures.has(captureId)) {
      return
    }

    networkCaptures.get(captureId).clear()
  }

  /**
   * Verifies the network capture exists for the supplied server id and destroys it.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the network capture was created for
   * @param {string} captureId The unique id of the network capture
   * @returns {void}
   */
  destroyNetworkCapture (serverId, captureId) {
    const networkCaptures = this.#networkCaptures.get(serverId + this.testId)

    if (!networkCaptures || !networkCaptures.has(captureId)) {
      return
    }

    networkCaptures.get(captureId).destroy()
    networkCaptures.delete(captureId)
  }

  /**
   * Verifies the network capture exists for the supplied server id and returns the network captures
   * current cache of captures as an array of serialized data.
   * @param {'assetServer'|'bamServer'} serverId Id of the server the network capture was created for
   * @param {string} captureId The unique id of the network capture
   * @param {import('./network-capture').NetworkCaptureWaitConditions} waitConditions Conditions to pause execution
   * @returns {Promise<import('./network-capture').SerializedNetworkCapture[]>} A promise that will resolve
   * with an array of serialized network captures once the wait conditions are met.
   */
  awaitNetworkCapture (serverId, captureId, waitConditions) {
    const networkCaptures = this.#networkCaptures.get(serverId + this.testId)

    if (!networkCaptures || !networkCaptures.has(captureId)) {
      return []
    }

    return networkCaptures.get(captureId).waitFor(waitConditions)
  }
}
