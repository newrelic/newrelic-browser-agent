const crypto = require('crypto')

/**
 * A function used to check if a fastify server request should be captured.
 * @typedef {Function} NetworkCaptureTestFn
 * @param {import('./test-handle')} this a reference to the testHandle
 * @param {import('fastify').FastifyRequest} request a reference to the fastify request object
 * @returns {boolean} true if the network request should be captured
 */

/**
 * Network capture options
 * @typedef {object} NetworkCaptureOptions
 * @property {NetworkCaptureTestFn} test function that takes the fastify request object and returns true if the expect should
 * be resolved
 */

/**
 * Serialized network capture
 * @typedef {object} SerializedNetworkCapture
 * @property {object} request object containing data extracted from the fastify request
 * @property {any} request.body a copy of the request body
 * @property {object} request.query a set of K/V pairs containing all the query parameters from the URI
 * @property {object} request.headers a set of K/V pairs containing all the headers from the request
 * @property {string} request.method the HTTP method used to make the request
 * @property {object} reply object containing data extracted from the fastify reply
 * @property {number} reply.statusCode status code the server responded with for the request
 * @property {number} reply.headers a set of K/V pairs containing all the headers from the reply
 * @property {number} reply.body a copy of the reply body if the reply was not a static asset
 */

/**
 * Conditions to pause execution based on requests being captured.
 * @typedef {object} NetworkCaptureWaitConditions
 * @property {number} timeout a predefined time to wait before continuing execution
 * @property {number} totalCount a predefined number of requests to wait on before continuing execution
 * @example If both timeout and totalCount are supplied, when the timeout is reached, the pause will end regardless
 * of the number of network captures and the supplied totalCount condition.
 * @example If both timeout and totalCount are supplied, when the totalCount of network captures reached the supplied
 * totalCount condition, the pause will end regardless of the timeout.
 */

/**
 * Deferred object
 * @typedef {object} Deferred
 * @property {Promise<SerializedNetworkCapture[]>} promise the underlying promise of the deferred object
 * @property {Function} resolve the resolve function of the deferred object
 * @property {Function} reject the reject function of the deferred object
 * @property {number} [timeout] the pending timeout for the deferred object
 * @property {() => void} checkWaitConditions a function used to force the wait conditions to be evaluated. If
 * the conditions pass, the wait will be ended and execution will continue
 */

module.exports = class NetworkCapture {
  #instanceId = crypto.randomUUID()

  /**
   * Cache of capture requests and replies
   * @type {Set<SerializedNetworkCapture>}
   */
  #captureCache = new Set()

  /**
   * Cache of deferred requests waiting on some capture conditions.
   * @type {Set<Deferred>}
   */
  #deferredCache = new Set()

  /**
   * The reference back to the wrapping test handle.
   * @type {import('./test-handle')}
   */
  #testHandle

  /**
   * The test function for this network capture
   * @type {NetworkCaptureTestFn}
   */
  #test

  /**
   * Creates a new instance of a network capture.
   * @param {import('./test-handle')} testHandle
   * @param {NetworkCaptureOptions} options
   */
  constructor (testHandle, options) {
    if (!options) {
      throw new Error('Options must be supplied when creating a network capture.')
    }
    if (typeof options.test !== 'function') {
      throw new Error('A test function must be supplied in the network capture options.')
    }

    this.#testHandle = testHandle
    this.#test = options.test
  }

  /**
   * A unique id to identify this specific network capture. This should be
   * used when interacting with this network capture from the testing platform.
   * @return {UUID}
   */
  get instanceId () {
    return this.#instanceId
  }

  /**
   * Exposes all the current captures this network capture has saved.
   * @return {SerializedNetworkCapture[]}
   */
  get captures () {
    return Array.from(this.#captureCache)
  }

  /**
   * Provides the results of executing the network capture test function passing in
   * the test server as the `this` context and the fastify request as the parameter.
   * @param {import('fastify').FastifyRequest} request
   * @return {boolean} True if the fastify request matches the requirements of the test
   * function.
   */
  test (request) {
    return this.#test.call(this.#testHandle, request)
  }

  /**
   * Captured a network request and reply.
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   * @param {any} payload
   */
  capture (request, reply, payload) {
    this.#captureCache.add({
      request: {
        body: request.body,
        query: request.query,
        headers: request.headers,
        method: request.method.toUpperCase()
      },
      reply: {
        statusCode: reply.statusCode,
        headers: reply.getHeaders(),
        body: request.url.startsWith('/tests/assets/') || request.url.startsWith('/build/')
          ? 'Asset content'
          : payload
      }
    })

    for (const deferred of this.#deferredCache) {
      deferred.checkWaitConditions()
    }
  }

  /**
   * Destroy all memory references to allow for garbage collection.
   * @returns {void}
   */
  destroy () {
    for (const deferred of this.#deferredCache) {
      if (deferred.timeout) {
        clearTimeout(deferred.timeout)
      }
      if (deferred.promise) {
        deferred.reject(new Error(`Waiting network capture destroyed before resolving: ${this.#test.name}`))
      }
    }
    this.#deferredCache.clear()
    this.#deferredCache = null

    this.#captureCache.clear()
    this.#captureCache = null

    this.#instanceId = null
    this.#testHandle = null
    this.#test = null
  }

  /**
   * Returns a promise that will resolve with the current capture cache once the provided
   * conditions have been met.
   * @param {NetworkCaptureWaitConditions} waitConditions Conditions to pause execution
   * @return {Promise<SerializedNetworkCapture[]>}
   */
  waitFor (waitConditions) {
    return this.#createDeferred(waitConditions).promise
  }

  /**
   * Creates a basic deferred object
   * @param {NetworkCaptureWaitConditions} waitConditions The conditions that, once met, indicate the
   * deferred object can be resolved.
   * @returns {Deferred}
   */
  #createDeferred (waitConditions) {
    let capturedResolve
    let capturedReject
    let promise = new Promise((resolve, reject) => {
      capturedResolve = resolve
      capturedReject = reject
    })

    /**
     * @type {Partial<Deferred>}
     */
    const deferred = { promise, resolve: capturedResolve, reject: capturedReject }
    deferred.checkWaitConditions = () => {
      if (typeof waitConditions.totalCount === 'number' && this.#captureCache.size >= waitConditions.totalCount) {
        capturedResolve(this.captures)
      }
    }

    if (typeof waitConditions.timeout === 'number' && waitConditions.timeout > 0) {
      deferred.timeout = setTimeout(() => {
        capturedResolve(this.captures)
      }, waitConditions.timeout)
    }
    promise.finally(() => {
      if (deferred.timeout) {
        clearTimeout(deferred.timeout)
      }

      this.#deferredCache?.delete(deferred)
    })

    deferred.checkWaitConditions()
    this.#deferredCache.add(deferred)
    return deferred
  }
}
