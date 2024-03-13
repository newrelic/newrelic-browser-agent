const { v4: uuidV4 } = require('uuid')
const { paths } = require('./constants')
const { urlFor } = require('./utils/url')
const path = require('path')
const { deepmerge } = require('deepmerge-ts')
const {
  testRumRequest,
  testEventsRequest,
  testTimingEventsRequest,
  testAjaxEventsRequest,
  testMetricsRequest,
  testCustomMetricsRequest,
  testSupportMetricsRequest,
  testErrorsRequest,
  testInsRequest,
  testAjaxTimeSlicesRequest,
  testResourcesRequest,
  testInteractionEventsRequest,
  testBlobRequest,
  testBlobReplayRequest,
  testBlobTraceRequest,
  testSessionReplaySnapshotRequest
} = require('./utils/expect-tests')

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
   * Tracks the count of request accesses keyed to a server id {'assetServer'|'bamServer'}
   */
  #requestCounts = {}

  constructor (testServer, testId) {
    this.#testServer = testServer
    this.#testId = testId || uuidV4()
  }

  get testServer () {
    return this.#testServer
  }

  get testId () {
    return this.#testId
  }

  get requestCounts () {
    return this.#requestCounts
  }

  /**
   * Processes an incoming request for scheduled responses and pending expects
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request was received on
   * @param {import('fastify').FastifyInstance} fastify fastify server the request was received on
   * @param {module:fastify.FastifyRequest} request the incoming request
   */
  processRequest (serverId, fastify, request) {
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
  }

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

  /**
   * Creates a deferred object that will resolve when a specific server request is seen or reject
   * when a timeout is met
   * @param {'assetServer'|'bamServer'} serverId Id of the server the request will be received on
   * @param {TestServerExpect} testServerExpect The expect options to apply to the server request
   * @returns {Promise<*>} Promise to await for the server request
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
   * Increments the request access counter for a specific server and route
   * @param {string} serverId Server id used to identify which of the test servers the request was received
   * @param {string} routeId Route id used to identify which of the routes the request was received
   */
  incrementRequestCount (serverId, routeId) {
    if (!this.#requestCounts[serverId]) {
      this.#requestCounts[serverId] = {}
    }

    const serverRequestCount = this.#requestCounts[serverId]
    if (!serverRequestCount[routeId]) {
      serverRequestCount[routeId] = 1
    } else {
      serverRequestCount[routeId] = serverRequestCount[routeId] + 1
    }
  }

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
      deepmerge(
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

  /**
   * Constructs a unit test URL based on the current test handle
   * @param {string} testFile Relative path of the test file from the root of the project
   * @returns {string} The URL that can be used to execute the unit test
   */
  urlForBrowserTest (testFile) {
    return urlFor(
      '/tests/assets/browser.html',
      {
        loader: 'full',
        config: {
          licenseKey: this.#testId,
          assetServerPort: this.testServer.assetServer.port,
          corsServerPort: this.testServer.corsServer.port
        },
        script:
          '/' + path.relative(paths.rootDir, testFile) + '?browserify=true'
      },
      this.#testServer
    )
  }

  /**
   * Creates a basic deferred object
   * @returns {Deferred}
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

  /* ***** BAM Expect Shortcut Methods (remove after removing jil) ***** */

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
