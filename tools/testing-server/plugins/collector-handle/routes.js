
function routeHandler(fastify, opts) {
  return async (request, reply) => {
    const {testId} = request.params;
    const handler = fastify.getCollectorHandle(testId);
    await handler.handle(request, reply);
  }
}

function applyRoutes(fastify, opts) {
  fastify.route({
    method: ['GET', 'POST'],
    url: '/1/:testId',
    handler: routeHandler(fastify, opts)
  });
  fastify.route({
    method: ['GET', 'POST'],
    url: '/events/1/:testId',
    handler: routeHandler(fastify, opts)
  });
  fastify.route({
    method: ['GET', 'POST'],
    url: '/jserrors/1/:testId',
    handler: routeHandler(fastify, opts)
  });
  fastify.route({
    method: ['GET', 'POST'],
    url: '/ins/1/:testId',
    handler: routeHandler(fastify, opts)
  });
  fastify.route({
    method: ['GET', 'POST'],
    url: '/resources/1/:testId',
    handler: routeHandler(fastify, opts)
  });
  fastify.route({
    method: ['GET','POST'],
    url: '/debug',
    handler: async (request, reply) => {
      opts.logger.debug(`DEBUG [${request.query.ix}](${request.query.testId}): ${request.query.m}`);
      reply.code(204)
    }
  });
}

module.exports = applyRoutes
