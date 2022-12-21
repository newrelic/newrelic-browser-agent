const path = require("path");
const querystring = require("querystring");

/**
 * Resolves the path of a file and provides a URL that can be used to load that
 * file.
 * @param {string} relativePath base path, typically the root of the repository
 * @param {object} options an object of query parameters to append to the URL
 * @param testServerConfig
 * @return {string}
 * @todo Need to remove the use of querystring in this method.
 */
function urlFor(relativePath, options, testServerConfig) {
  let query = querystring.stringify(options);

  if (relativePath.indexOf("%") > -1) {
    // Double-encode the file path part that contains a percent symbol
    // to allow files like tests/assets/symbols%20in&referrer.html to
    // be properly served from fastify
    relativePath = relativePath
      .split("/")
      .map((part) => encodeURIComponent(encodeURIComponent(part)))
      .join("/");
  }

  return new URL(
    `${relativePath}?${query}`,
    new URL(
      `http://${testServerConfig.cliOpts.host}:${testServerConfig.serverConfig.assetServerPort}`,
      "resolve://"
    )
  ).toString();
}

/**
 * Resolves the URL for a browser (unit) test so it can be accessed from the test
 * server and the tests will execute.
 * @param filePath Browser test file path
 * @param testServerConfig
 * @return {string}
 */
function urlForBrowserTest(filePath, testServerConfig) {
  return urlFor(
    "/tests/assets/browser.html",
    {
      loader: "full",
      config: Buffer.from(
        JSON.stringify({
          licenseKey: 1234,
          assetServerPort: testServerConfig.serverConfig.assetServerPort,
          corsServerPort: testServerConfig.serverConfig.corsServerPort,
        })
      ).toString("base64"),
      script:
        "/" +
        path.relative(testServerConfig.paths.rootDir, filePath) +
        "?browserify=true",
    },
    testServerConfig
  );
}

module.exports = {
  urlFor,
  urlForBrowserTest,
};
