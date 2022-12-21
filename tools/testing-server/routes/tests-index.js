const path = require("path");
const fp = require("fastify-plugin");
const getFiles = require("../utils/get-files");
const { urlFor } = require("../utils/url");

/**
 * Fastify plugin to build out the test server index HTML file. This will list
 * out all the test HTML pages and unit tests with appropriate links for running
 * those tests.
 */
module.exports = fp(async function (fastify, opts) {
  let response;

  fastify.get("/", async (request, reply) => {
    if (!response) {
      response = "<html><head></head><body><ul>\n";

      for await (const file of getFiles(opts.paths.testsAssetsDir)) {
        if (file.endsWith(".html")) {
          const filePath = path.relative(opts.paths.rootDir, file);
          response += `<li><a href="${filePath}">${filePath}</a></li>\n`;
        }
      }

      for await (const file of getFiles(opts.paths.testsBrowserDir)) {
        if (file.endsWith(".browser.js")) {
          const filePath = path.relative(opts.paths.rootDir, file);
          response += `<li><a href="${browserTestTarget(
            filePath
          )}">${filePath}</a></li>\n`;
        }
      }

      response += "</ul></body><html>";
    }

    reply.code(200).type("text/html; charset=UTF-8").send(response);
  });

  function browserTestTarget(filePath) {
    return urlFor(
      "/tests/assets/browser.html",
      {
        config: Buffer.from(
          JSON.stringify({
            assetServerPort: opts.serverConfig.assetServerPort,
            corsServerPort: opts.serverConfig.corsServerPort,
          })
        ).toString("base64"),
        script: encodeURIComponent(`/${filePath}?browserify=true`),
      },
      opts
    );
  }
});
