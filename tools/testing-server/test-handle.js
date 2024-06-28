const { v4: uuidV4 } = require('uuid')
const { paths } = require('./constants')
const { urlFor } = require('./utils/url')
const path = require('path')
const { deepmerge } = require('deepmerge-ts')
const NetworkCapture = require('./network-capture')

/**
 * Scheduled reply options
 * @typedef {object} ScheduledReply
 * @property {Function|string} test function that takes the fastify request object and returns true if the scheduled
 * response should be applied
 * @property {boolean} permanent indicates if the reply should be left in place
 * @property {number} statusCode response code
 * @property {string} body response body
 * @property {number} delay delay the response by a number of milliseconds
 * @property {string[]} removeHeaders list of headers to remove from the response
 * @property {{ key: string, value: string }[]} setHeaders list of key:value pairs to add as headers to the response
 */

/**
 * Test server expect options
 * @typedef {object} TestServerExpect
 * @property {false|number|null|undefined} timeout time in milliseconds to timeout and reject the expect or false if the
 * timeout should not be applied
 * @property {Function|string} test function that takes the fastify request object and returns true if the expect should
 * be resolved
 * @property {boolean} expectTimeout boolean indicating if the expect is expected to timeout; useful when you want to expect
 * that a certain network call does not happen
 * @deprecated
 */

/**
 * Deferred object
 * @typedef {object} Deferred
 * @property {Promise<any>} promise the underlying promise of the deferred object
 * @property {Function} resolve the resolve function of the deferred object
 * @property {Function} reject the reject function of the deferred object
 * @property {NodeJS.Timeout} [timeout] the pending timeout for the deferred object
 * @property {Function} [test] optional test function that takes the request and
 * returns a boolean indicating if the request matches. This is useful for the
 * jserrors BAM endpoint where multiple types of data are reported.
 * @property {boolean} expectTimeout boolean indicating if the expect is expected to timeout; useful when you want to expect
 * that a certain network call does not happen
 * @deprecated
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
   * List of pending expects keyed to a server id {'assetServer'|'bamServer'}
   * @type {Map<string, Set<Deferred>>}
   */
  #pendingExpects = new Map()

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

    for (const pendingExpectSet of this.#pendingExpects.values()) {
      for (const pendingExpect of pendingExpectSet) {
        if (pendingExpect.timeout) {
          clearTimeout(pendingExpect.timeout)
        }
        if (pendingExpect.promise) {
          pendingExpect.reject('Expect destroyed before resolving')
        }
      }
      pendingExpectSet.clear()
    }
    this.#pendingExpects.clear()
    this.#pendingExpects = null

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
    if (this.#scheduledReplies.has(serverId)) {
      const scheduledReplies = this.#scheduledReplies.get(serverId)

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

    // Deprecated Expects logic
    if (this.#pendingExpects.has(serverId)) {
      const pendingExpects = this.#pendingExpects.get(serverId)

      for (const pendingExpect of pendingExpects) {
        try {
          let test = pendingExpect.test

          if (test.call(this, request)) {
            request.resolvingExpect = pendingExpect
            clearTimeout(pendingExpect.timeout)
            pendingExpects.delete(pendingExpect)
            break
          }
        } catch (e) {
          fastify.log.error(e)
          pendingExpect.reject(e)
          pendingExpects.delete(pendingExpect)
        }
      }
    }

    // Network Captures logic
    if (this.#networkCaptures.has(serverId)) {
      const networkCaptures = this.#networkCaptures.get(serverId)

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
    if (!this.#scheduledReplies.has(serverId)) {
      this.#scheduledReplies.set(serverId, new Set())
    }

    this.#scheduledReplies.get(serverId).add(scheduledReply)
  }

  /**
   * Clears the scheduled replies for a server
   * @param {'assetServer'|'bamServer'} serverId Id of the server to clear
   */
  clearScheduledReplies (serverId) {
    this.#scheduledReplies.set(serverId, new Set())
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
    if (!this.#networkCaptures.has(serverId)) {
      this.#networkCaptures.set(serverId, new Map())
    }

    return networkCaptureOptions
      .map(options => {
        const networkCapture = new NetworkCapture(this, options)
        this.#networkCaptures.get(serverId).set(networkCapture.instanceId, networkCapture)
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
    const networkCaptures = this.#networkCaptures.get(serverId)

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
    const networkCaptures = this.#networkCaptures.get(serverId)

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
    const networkCaptures = this.#networkCaptures.get(serverId)

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
    const networkCaptures = this.#networkCaptures.get(serverId)

    if (!networkCaptures || !networkCaptures.has(captureId)) {
      return []
    }

    return networkCaptures.get(captureId).waitFor(waitConditions)
  }

  // Deprecated Expects logic

  /**
   * Creates a deferred object that will resolve when a specific server request is seen or reject
   * when a timeout is met
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {TestServerExpect} testServerExpect The expect options to apply to the server request
   * @returns {Promise<*>} Promise to await for the server request
   * @deprecated
   */
  expect (serverId, testServerExpect) {
    if (!this.#pendingExpects.has(serverId)) {
      this.#pendingExpects.set(serverId, new Set())
    }

    if (!testServerExpect.test) {
      return Promise.reject(new Error('A test function must be provided.'))
    }

    const deferred = this.#createDeferred()
    deferred.test = testServerExpect.test
    deferred.expectTimeout = testServerExpect.expectTimeout

    if (testServerExpect.timeout !== false) {
      deferred.timeout = setTimeout(() => {
        let testName = testServerExpect.test.name

        if (deferred.expectTimeout) {
          deferred.resolve()
        } else {
          deferred.reject(new Error(
            `Expect ${testName} for ${serverId} timed out after ${testServerExpect.timeout || this.#testServer.config.timeout}ms for test ${this.#testId}`
          ))
        }
        this.#pendingExpects.get(serverId).delete(deferred)
      }, testServerExpect.timeout || this.#testServer.config.timeout)
    }

    this.#pendingExpects.get(serverId).add(deferred)

    return deferred.promise
  }

  /**
   * Creates a basic deferred object
   * @returns {Deferred}
   * @deprecated
   */
  #createDeferred () {
    let capturedResolve
    let capturedReject
    let promise = new Promise((resolve, reject) => {
      capturedResolve = resolve
      capturedReject = reject
    })

    return { promise, resolve: capturedResolve, reject: capturedReject }
  }
}
