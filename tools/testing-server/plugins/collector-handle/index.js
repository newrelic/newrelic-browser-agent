const fp = require("fastify-plugin");
const CollectorHandle = require("./handle");
const applyRoutes = require("./routes");

/**
 * Fastify plugin to apply collector routes and handles. These are used
 * by the collector server and testing infrastructure to schedule responses,
 * wait for certain collector calls, etc.
 */
module.exports = fp(async function (fastify, opts) {
  const handles = new Map();

  const defaultHandler = new CollectorHandle(opts.agentConfig.licenseKey, opts.logger);
  handles.set(opts.agentConfig.licenseKey, defaultHandler);

  fastify.decorate('createCollectorHandle', (handleId) => {
    if (handles.has(handleId)) {
      opts.logger.warn(`Collector handler collision detected for ID ${handleId}`);
      handles.get(handleId).destroy();
    }

    const handle = new CollectorHandle(handleId, opts.logger);
    handles.set(handleId, handle)
  })

  fastify.decorate('getCollectorHandle', (handleId) => {
    if (!handles.has(handleId)) {
      opts.logger.warn(`Collector handler not found for ID ${handleId}`);
      return defaultHandler;
    }

    return handles.get(handleId);
  })

  fastify.decorate('destroyCollectorHandle', (handleId) => {
    if (handles.has(handleId)) {
      handles.get(handleId).destroy();
    }
  })

  applyRoutes(fastify, opts);
});
