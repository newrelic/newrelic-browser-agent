const fp = require("fastify-plugin");
const querypack = require("@newrelic/nr-querypack");
const { beaconRequests } = require("../../constants");

const beaconRequestsRegex = new RegExp(
  "^[" +
    Object.keys(beaconRequests).reduce((agg, br) => `${agg}|${br}/1/`, "/1/") +
    "]",
  "i"
);

/**
 * Fastify plugin to add a custom text/plain content parser that uses querypack.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.addContentTypeParser(
    "text/plain",
    { parseAs: "string" },
    (request, body, done) => {
      if (request.url.match(beaconRequestsRegex)) {
        if (body.startsWith("bel.")) {
          try {
            done(null, querypack.decode(body));
          } catch (error) {
            done(error, body);
          }
        } else {
          try {
            done(null, JSON.parse(body));
          } catch (error) {
            done(error, body);
          }
        }
      }

      done(null, body);
    }
  );
});
