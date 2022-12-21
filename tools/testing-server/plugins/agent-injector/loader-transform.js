const { Transform } = require("stream");
const path = require("path");
const fs = require("fs");
const sslShim = require("./ssl-shim");

/**
 * Transforms requests for HTML files that contain the \{loader\} string with the
 * built loader JS. By default, the full loader will be used but can be overriden
 * by passing the loader query param. If polyfills are enabled via CLI, the polyfill
 * version of the loader will be injected instead.
 */
class LoaderTransform extends Transform {
  #loaderName;
  #testServerConfig;

  constructor(loaderName, testServerConfig, transformOptions) {
    super(transformOptions);

    this.#loaderName = loaderName;
    this.#testServerConfig = testServerConfig;
  }

  async _transform(chunk, encoding, done) {
    const chunkString = chunk.toString();

    if (chunkString.indexOf("{loader}") > -1) {
      const replacement = await this.#getLoaderContent();
      done(
        null,
        chunkString.replace(
          "{loader}",
          `<script type="text/javascript">${sslShim}${replacement}</script>`
        )
      );
    } else {
      done(null, chunkString);
    }
  }

  async #getLoaderContent() {
    const loaderFilePath = path.join(
      this.#testServerConfig.paths.builtAssetsDir,
      `nr-loader-${this.#loaderName}${
        this.#usePolyfills() ? "-polyfills" : ""
      }.min.js`
    );
    const loaderFileStats = await fs.promises.stat(loaderFilePath);

    if (!loaderFileStats.isFile()) {
      throw new Error(`Could not find loader file ${loaderFilePath}`);
    }

    return await fs.promises.readFile(loaderFilePath);
  }

  #usePolyfills() {
    return this.#testServerConfig.cliOpts.polyfills === true;
  }
}

module.exports = LoaderTransform;
