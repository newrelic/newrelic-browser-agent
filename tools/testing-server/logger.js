class TestServerLogger {
  level = 'info'

  #config
  #parentLogger

  constructor (config) {
    this.#config = config

    if (!config.logger) {
      this.#parentLogger = console
    } else {
      this.#parentLogger = config.logger
    }
  }

  logNetworkRequest (fastify, request, reply) {
    if (this.#config.logRequests) {
      this.#parentLogger.info(`${request.server.testServerId} -> ${request.method} ${request.url} ${reply.statusCode}`)

      if (fastify.testServerId === 'bamServer') {
        this.#parentLogger.info(JSON.stringify(request.body))
      } else if (fastify.testServerId === 'commandServer') {
        this.#parentLogger.info(request.body)
      }
    }
  }

  logDebugShimMessage (request) {
    if (this.#config.debugShim) {
      this.#parentLogger.info(`DEBUG [${request.query.testId}](${request.query.ix}): ${request.query.m}`)
    }
  }
}

module.exports = TestServerLogger
