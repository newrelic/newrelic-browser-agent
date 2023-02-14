
class CollectorHandle {
  #handleId
  #logger

  constructor (handleId, logger) {
    this.#handleId = handleId
    this.#logger = logger
  }

  async handle (request, reply) {

  }

  async destroy () {

  }
}

module.exports = CollectorHandle
