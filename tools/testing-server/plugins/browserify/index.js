const fp = require("fastify-plugin");
const BrowserifyTransform = require("./browserify-transform");

/**
 * Fastify plugin to apply transformations for test JS files that need to be
 * transpiled through browserify.
 */
module.exports = fp(async function (fastify, opts) {
  const browserifyCache = new Map();

  fastify.addHook("onSend", async (request, reply, payload) => {
    if (
      !payload ||
      !payload.filename ||
      payload.filename.indexOf(opts.paths.testsBrowserDir) === -1 ||
      !payload.filename.endsWith(".js")
    ) {
      return payload;
    }

    reply.removeHeader("content-length");
    return payload.pipe(
      new BrowserifyTransform(
        payload.filename,
        opts.cliOpts.cache ? browserifyCache : null
      )
    );
  });
});
