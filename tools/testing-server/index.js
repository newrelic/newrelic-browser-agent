const fastify = require('fastify')
const waitOn = require('wait-on')
const { paths } = require('./constants')
const TestHandle = require('./test-handle')
const TestServerLogger = require('./logger')

/**
 * Test server configuration options
 * @typedef {object} TestingServerConfig
 * @property {boolean} logRequests indicates if the servers should log out requests
 * @property {number} timeout default timeout for expect calls to bam endpoints
 * @property {string} host host to use in constructing urls for the testing servers
 * @property {number} port asset server port to be used
 * @property {TestingServerLogger} logger logger to pass to the testing servers and plugins
 * @property {string} loader default loader to use when not specified
 * @property {boolean} debugShim indicates if the debug shim should be injected into HTML assets
 * @property {boolean} polyfills indicates if polyfills should be used for the agent
 */

/**
 * Logger that can be used by the testing servers
 * @typedef {object} TestingServerLogger
 * @property {Function} log standard log output
 * @property {Function} info info log output
 * @property {Function} warn warning log output
 * @property {Function} error error log output
 */

class TestServer {
  /**
   * Testing server config.
   * @type TestingServerConfig
   */
  #config

  /**
   * Default fastify server config
   */
  #defaultServerConfig = {
    forceCloseConnections: true,
    maxParamLength: Number.MAX_SAFE_INTEGER,
    bodyLimit: Number.MAX_SAFE_INTEGER,
    logger: false
  }

  /**
   * Fastify asset server instance.
   * @type import('fastify').FastifyInstance
   */
  #assetServer

  /**
   * Fastify bam server instance.
   * @type import('fastify').FastifyInstance
   */
  #bamServer

  /**
   * Fastify command server instance.
   * @type import('fastify').FastifyInstance
   */
  #commandServer

  /**
   * List of test handles keyed to a test id
   * @type {Map<string, TestHandle>}
   */
  #testHandles = new Map()

  /**
   * Custom logger for the test server
   */
  #logger

  constructor (config) {
    this.#config = config
    this.#logger = new TestServerLogger(config)

    this.#createAssetServer()
    this.#createBamServer()
    this.#createCommandServer()
  }

  /**
   * Starts all the servers used for testing.
   * @return {Promise<void>}
   */
  async start () {
    await Promise.all([
      this.#assetServer.listen({ host: '0.0.0.0', port: this.#config.port }),
      this.#bamServer.listen({ host: '0.0.0.0', port: 0 }),
      this.#commandServer.listen({ host: '0.0.0.0', port: 0 })
    ])

    await this.ready()
  }

  /**
   * Stops all the testing servers.
   * @return {Promise<void>}
   */
  async stop () {
    await Promise.all([
      this.#assetServer.close(),
      this.#bamServer.close(),
      this.#commandServer.close()
    ])
  }

  /**
   * Checks if the servers are ready to accept requests.
   * @return {Promise<void>}
   */
  async ready () {
    await waitOn({
      resources: [
        `http-get://127.0.0.1:${this.assetServer.port}/health`,
        `http-get://127.0.0.1:${this.bamServer.port}/health`,
        `http-get://127.0.0.1:${this.commandServer.port}/health`
      ]
    })
  }

  get config () {
    return this.#config
  }

  get assetServer () {
    return {
      server: this.#assetServer,
      host: this.#config.host,
      port: this.#getServerPort(this.#assetServer)
    }
  }

  get bamServer () {
    return {
      server: this.#bamServer,
      host: this.#config.host,
      port: this.#getServerPort(this.#bamServer)
    }
  }

  get commandServer () {
    return {
      server: this.#commandServer,
      host: this.#config.host,
      port: this.#getServerPort(this.#commandServer)
    }
  }

  createTestHandle (testId) {
    const testHandle = new TestHandle(this, testId)
    this.#testHandles.set(testHandle.testId, testHandle)
    return testHandle
  }

  destroyTestHandle (testId) {
    this.#testHandles.get(testId).destroy()
    this.#testHandles.delete(testId)
  }

  getTestHandle (testId) {
    return this.#testHandles.get(testId)
  }

  #createAssetServer () {
    this.#assetServer = fastify(this.#defaultServerConfig)

    this.#assetServer.decorate('testServerId', 'assetServer')
    this.#assetServer.register(require('./plugins/cache-interceptor')) // pre-process the request to help prevent cache responses
    this.#assetServer.register(require('@fastify/compress')) // handle gzip payloads, reply with gzip'd content
    this.#assetServer.decorate('testServerLogger', this.#logger)
    this.#assetServer.register(require('@fastify/multipart'), {
      attachFieldsToBody: true
    })
    this.#assetServer.register(require('@fastify/cors'), {
      origin: true,
      credentials: true,
      exposedHeaders: ['X-NewRelic-App-Data', 'Date'],
      preflightContinue: true,
      cacheControl: 'no-cache, must-revalidate, proxy-revalidate'
    })
    this.#assetServer.register(require('@fastify/static'), {
      root: paths.rootDir,
      prefix: '/',
      index: ['index.html']
    })
    this.#assetServer.register(require('./plugins/agent-injector'), this)
    this.#assetServer.register(require('./routes/tests-index'), this)
    this.#assetServer.register(require('./routes/mock-apis'), this)
    this.#assetServer.register(require('./plugins/test-handle'), this)
    this.#assetServer.register(require('./plugins/no-cache'))
    this.#assetServer.register(require('./plugins/request-logger'))
  }

  #createBamServer () {
    this.#bamServer = fastify(this.#defaultServerConfig)

    this.#bamServer.decorate('testServerId', 'bamServer')
    this.#bamServer.register(require('./plugins/cache-interceptor')) // pre-process the request to help prevent cache responses
    this.#bamServer.register(require('./plugins/compression-interceptor')) // pre-process the request to help it conform with compression standards
    this.#bamServer.register(require('@fastify/compress')) // handle gzip payloads, reply with gzip'd content
    this.#bamServer.decorate('testServerLogger', this.#logger)
    this.#bamServer.register(require('@fastify/multipart'), {
      attachFieldsToBody: true
    })
    this.#bamServer.register(require('@fastify/cors'), {
      origin: true,
      credentials: true,
      exposedHeaders: ['X-NewRelic-App-Data', 'Date'],
      preflightContinue: true,
      cacheControl: 'no-cache, must-revalidate, proxy-revalidate'
    })
    this.#bamServer.register(require('@fastify/static'), {
      root: paths.rootDir,
      prefix: '/',
      index: ['index.html']
    })
    this.#bamServer.register(require('./plugins/agent-injector'), this)
    this.#bamServer.register(require('./routes/tests-index'), this)
    this.#bamServer.register(require('./routes/mock-apis'), this)
    this.#bamServer.register(require('./plugins/bam-parser'), this)
    this.#bamServer.register(require('./routes/bam-apis'), this)
    this.#bamServer.register(require('./plugins/test-handle'), this)
    this.#bamServer.register(require('./plugins/no-cache'))
    this.#bamServer.register(require('./plugins/request-logger'))
  }

  #createCommandServer () {
    this.#commandServer = fastify(this.#defaultServerConfig)

    this.#commandServer.decorate('testServerId', 'commandServer')
    this.#commandServer.decorate('testServerLogger', this.#logger)
    this.#commandServer.register(require('./routes/command-apis'), this)
    this.#commandServer.register(require('./plugins/no-cache'))
    this.#commandServer.register(require('./plugins/request-logger'))
    this.#commandServer.register(require('./plugins/deserialize-body'))
  }

  /**
   * Determines the port the provided server is listening on. Only returns
   * the first found port.
   * @param {FastifyInstance} server The server to get the port for
   * @return {number} The port the target server is listening on
   */
  #getServerPort (server) {
    const listeningAddresses = server.addresses()
    if (Array.isArray(listeningAddresses) && listeningAddresses.length > 0) {
      return listeningAddresses[0].port
    }

    return 0
  }
}

module.exports = TestServer
