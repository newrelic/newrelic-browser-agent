const fp = require("fastify-plugin");

/**
 * Fastify plugin to disable browser caching. Caching when running tests can cause
 * false positives and negatives.
 */
module.exports = fp(async function (fastify) {
  fastify.addHook("onSend", async (request, reply, payload) => {
    reply.header("Surrogate-Control", "no-store");
    reply.header(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    reply.header("Pragma", "no-cache");
    reply.header("Expires", "0");

    return payload;
  });
});
