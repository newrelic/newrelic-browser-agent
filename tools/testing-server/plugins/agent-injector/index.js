const fp = require("fastify-plugin");
const LoaderTransform = require("./loader-transform");
const ConfigTransform = require("./config-transform");
const InitTransform = require("./init-transform");
const WorkerCommandsTransformer = require("./worker-commands-transform");
const ScriptTransform = require("./script-transform");
const PolyfillsTransform = require("./polyfills-transform");

/**
 * Fastify plugin to apply transformations for test HTML files for the injection
 * of the agent and other supported testing and configuration scripts.
 */
module.exports = fp(async function (fastify, opts) {
  fastify.addHook("onSend", async (request, reply, payload) => {
    if (
      !payload ||
      !payload.filename ||
      payload.filename.indexOf(opts.paths.testsAssetsDir) === -1 ||
      !payload.filename.endsWith(".html")
    ) {
      return payload;
    }

    reply.removeHeader("content-length");
    return payload
      .pipe(
        new LoaderTransform(request.query.loader || opts.cliOpts.loader, opts)
      )
      .pipe(new ConfigTransform(request.query, opts))
      .pipe(new InitTransform(request.query))
      .pipe(new WorkerCommandsTransformer(request.query))
      .pipe(new ScriptTransform(request.query))
      .pipe(new PolyfillsTransform(opts));
  });
});
