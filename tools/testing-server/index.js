const fastify = require('fastify')
const { urlFor } = require('./utils/url')
const waitOn = require('wait-on')
const { paths, defaultAgentConfig } = require('./constants')
const TestHandle = require('./test-handle')

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
   * Fastify asset server instance.
   * @type module:fastify.FastifyInstance
   */
  #assetServer

  /**
   * Fastify cors server instance.
   * This is a stripped down asset server that only has the API test routes.
   * @type module:fastify.FastifyInstance
   */
  #corsServer

  /**
   * Fastify bam server instance.
   * @type module:fastify.FastifyInstance
   */
  #bamServer

  /**
   * Fastify command server instance.
   * @type module:fastify.FastifyInstance
   */
  #commandServer

  /**
   * List of test handles keyed to a test id
   * @type {Map<string, TestHandle>}
   */
  #testHandles = new Map()

  constructor (config) {
    if (!config.logger) {
      config.logger = console
    }

    this.#config = config

    this.#createAssetServer()
    this.#createCorsServer()
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
      this.#corsServer.listen({ host: '0.0.0.0', port: 0 }),
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
      this.#corsServer.close(),
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
        `http-get://127.0.0.1:${this.assetServer.port}/`,
        `http-get://127.0.0.1:${this.corsServer.port}/json`,
        `http-get://127.0.0.1:${this.bamServer.port}/1/${defaultAgentConfig.licenseKey}`,
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

  get corsServer () {
    return {
      server: this.#corsServer,
      host: this.#config.host,
      port: this.#getServerPort(this.#corsServer)
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
    this.#testHandles.delete(testId)
  }

  getTestHandle (testId) {
    return this.#testHandles.get(testId)
  }

  /**
   * Backwards compatibility with JIL
   * @deprecated
   */
  get router () {
    return {
      handle: (testId) => {
        return this.createTestHandle(testId)
      },
      createTestHandle: this.createTestHandle.bind(this),
      destroyTestHandle: this.destroyTestHandle.bind(this)
    }
  }

  /**
   * Backwards compatibility with JIL
   * @deprecated
   */
  urlFor (relativePath, options) {
    return urlFor(relativePath, options, this)
  }

  #createAssetServer () {
    this.#assetServer = fastify({
      maxParamLength: Number.MAX_SAFE_INTEGER,
      bodyLimit: Number.MAX_SAFE_INTEGER,
      logger: this.#config.logRequests ? this.#config.logger : false
    })

    this.#assetServer.decorate('testServerId', 'assetServer')
    this.#assetServer.register(require('@fastify/multipart'), {
      addToBody: true
    })
    this.#assetServer.register(require('@fastify/cors'), {
      origin: true,
      credentials: true,
      exposedHeaders: 'X-NewRelic-App-Data'
    })
    this.#assetServer.register(require('@fastify/static'), {
      root: paths.rootDir,
      prefix: '/',
      index: false,
      cacheControl: false,
      etag: false
    })
    this.#assetServer.register(require('./plugins/agent-injector'), this)
    this.#assetServer.register(require('./plugins/browserify'), this)
    this.#assetServer.register(require('./routes/tests-index'), this)
    this.#assetServer.register(require('./routes/mock-apis'), this)
    this.#assetServer.register(require('./plugins/test-handle'), this)
    this.#assetServer.register(require('./plugins/no-cache'))
  }

  #createCorsServer () {
    this.#corsServer = fastify({
      maxParamLength: Number.MAX_SAFE_INTEGER,
      bodyLimit: Number.MAX_SAFE_INTEGER,
      logger: this.#config.logRequests ? this.#config.logger : false
    })

    this.#corsServer.decorate('testServerId', 'corsServer')
    this.#corsServer.register(require('@fastify/multipart'), {
      addToBody: true
    })
    this.#corsServer.register(require('@fastify/cors'), {
      origin: true,
      credentials: true,
      exposedHeaders: 'X-NewRelic-App-Data'
    })
    this.#corsServer.register(require('./routes/mock-apis'), this)
    this.#corsServer.register(require('./plugins/no-cache'))
  }

  #createBamServer () {
    this.#bamServer = fastify({
      maxParamLength: Number.MAX_SAFE_INTEGER,
      bodyLimit: Number.MAX_SAFE_INTEGER,
      logger: this.#config.logRequests ? this.#config.logger : false
    })

    this.#bamServer.decorate('testServerId', 'bamServer')
    this.#bamServer.register(require('@fastify/multipart'), {
      addToBody: true
    })
    this.#bamServer.register(require('@fastify/cors'), {
      origin: true,
      credentials: true,
      exposedHeaders: 'X-NewRelic-App-Data'
    })
    this.#bamServer.register(require('./plugins/bam-parser'), this)
    this.#bamServer.register(require('./routes/bam-apis'), this)
    this.#bamServer.register(require('./plugins/test-handle'), this)
    this.#bamServer.register(require('./plugins/no-cache'))
  }

  #createCommandServer () {
    this.#commandServer = fastify({
      maxParamLength: Number.MAX_SAFE_INTEGER,
      bodyLimit: Number.MAX_SAFE_INTEGER,
      logger: this.#config.logRequests ? this.#config.logger : false
    })

    this.#commandServer.decorate('testServerId', 'commandServer')
    this.#commandServer.register(require('./routes/command-apis'), this)
    this.#commandServer.register(require('./plugins/no-cache'))
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
