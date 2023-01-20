const fp = require("fastify-plugin");
const { rumFlags, beaconRequests } = require("../constants");

/**
 * Fastify plugin to apply routes to the bam server.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.route({
    method: ["GET", "POST"],
    url: "/1/:testId",
    handler: async (request, reply) => {
      const testHandle = fastify.getCreateTestHandle(request.params.testId);
      testHandle.resolveBeaconExpects(beaconRequests.rum, request);

      let scheduledResponse = testHandle.getNextScheduledReply(
        beaconRequests.rum
      );

      if (scheduledResponse?.delay) {
        await new Promise(resolve => setTimeout(resolve, scheduledResponse.delay))
      }

      if (!request.query.jsonp) {
        reply
          .code(scheduledResponse?.statusCode || 200)
          .send(scheduledResponse?.body || JSON.stringify(rumFlags));
      } else {
        reply
          .code(scheduledResponse?.statusCode || 200)
          .send(
            `${request.query.jsonp}(${
              scheduledResponse?.body || JSON.stringify(rumFlags)
            })`
          );
      }
    },
  });
  fastify.route({
    method: ["GET", "POST"],
    url: "/events/1/:testId",
    handler: async (request, reply) => {
      const testHandle = fastify.getCreateTestHandle(request.params.testId);
      testHandle.resolveBeaconExpects(beaconRequests.events, request);

      let scheduledResponse;
      if (Array.isArray(request.body) && request.body.findIndex(event => event.type === 'timing') > -1) {
        scheduledResponse = testHandle.getNextScheduledReply(
          beaconRequests.timings
        );
      } else {
        scheduledResponse = testHandle.getNextScheduledReply(
          beaconRequests.events
        );
      }

      if (scheduledResponse?.delay) {
        await new Promise(resolve => setTimeout(resolve, scheduledResponse.delay))
      }

      reply
        .code(scheduledResponse?.statusCode || 200)
        .send(scheduledResponse?.body || "");
    },
  });
  fastify.route({
    method: ["GET", "POST"],
    url: "/jserrors/1/:testId",
    handler: async (request, reply) => {
      const testHandle = fastify.getCreateTestHandle(request.params.testId);
      testHandle.resolveBeaconExpects(beaconRequests.jserrors, request);

      const scheduledResponse = testHandle.getNextScheduledReply(
        beaconRequests.jserrors
      );

      if (scheduledResponse?.delay) {
        await new Promise(resolve => setTimeout(resolve, scheduledResponse.delay))
      }

      reply
        .code(scheduledResponse?.statusCode || 200)
        .send(scheduledResponse?.body || "");
    },
  });
  fastify.route({
    method: ["GET", "POST"],
    url: "/ins/1/:testId",
    handler: async (request, reply) => {
      const testHandle = fastify.getCreateTestHandle(request.params.testId);
      testHandle.resolveBeaconExpects(beaconRequests.ins, request);

      const scheduledResponse = testHandle.getNextScheduledReply(
        beaconRequests.ins
      );

      if (scheduledResponse?.delay) {
        await new Promise(resolve => setTimeout(resolve, scheduledResponse.delay))
      }

      reply
        .code(scheduledResponse?.statusCode || 200)
        .send(scheduledResponse?.body || "");
    },
  });
  fastify.route({
    method: ["GET", "POST"],
    url: "/resources/1/:testId",
    handler: async (request, reply) => {
      const testHandle = fastify.getCreateTestHandle(request.params.testId);
      testHandle.resolveBeaconExpects(beaconRequests.resources, request);

      const scheduledResponse = testHandle.getNextScheduledReply(
        beaconRequests.resources
      );

      if (scheduledResponse?.delay) {
        await new Promise(resolve => setTimeout(resolve, scheduledResponse.delay))
      }

      reply
        .code(scheduledResponse?.statusCode || 200)
        .send(scheduledResponse?.body || "123-456");
    },
  });
  fastify.route({
    method: ["GET", "POST"],
    url: "/cat-cors/:testId",
    handler: async (request, reply) => {
      const testHandle = fastify.getCreateTestHandle(request.params.testId);
      testHandle.resolveCorsAjaxExpects(request);

      const scheduledResponse = testHandle.getNextScheduledReply(
        'cors'
      );

      if (scheduledResponse?.delay) {
        await new Promise(resolve => setTimeout(resolve, scheduledResponse.delay))
      }

      reply
        .code(scheduledResponse?.statusCode || 200)
        .send(scheduledResponse?.body || "123-456");
    },
  });
});
