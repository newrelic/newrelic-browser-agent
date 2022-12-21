const path = require("path");
const { Transform, Writable } = require("stream");
const BrowserifyTransform = require("../browserify/browserify-transform");

// Polyfills cache
let polyfillsCache = null;

/**
 * Transforms requests for HTML files that contain the \{polyfills\} string with the
 * browserified source from cdn/agent-loader/polyfills/polyfills.js.
 */
class PolyfillsTransform extends Transform {
  #testServerConfig;

  constructor(testServerConfig, transformOptions) {
    super(transformOptions);

    this.#testServerConfig = testServerConfig;
  }

  async _transform(chunk, encoding, done) {
    const chunkString = chunk.toString();

    if (
      chunkString.indexOf("{polyfills}") > -1 &&
      this.#testServerConfig.cliOpts.polyfills
    ) {
      if (!polyfillsCache) {
        polyfillsCache = await this.#getPolyfillsContent();
      }
      done(
        null,
        chunkString.replace(
          "{polyfills}",
          `<script type="text/javascript">${polyfillsCache}</script>`
        )
      );
    } else if (
      chunkString.indexOf("{polyfills}") > -1 &&
      !this.#testServerConfig.cliOpts.polyfills
    ) {
      done(null, chunkString.replace("{polyfills}", ""));
    } else {
      done(null, chunkString);
    }
  }

  #getPolyfillsContent() {
    return new Promise((resolve) => {
      const stream = new (class extends Writable {
        #chunks = [];

        _write(chunk, encoding, callback) {
          this.#chunks.push(Buffer.from(chunk));
          callback();
        }

        toString() {
          return Buffer.concat(this.#chunks).toString("utf8");
        }
      })();

      const browserifyTransform = new BrowserifyTransform(
        path.resolve(
          this.#testServerConfig.paths.rootDir,
          "cdn/agent-loader/polyfills/polyfills.js"
        ),
        null
      );
      browserifyTransform.pipe(stream);
      browserifyTransform.end("", () => {
        resolve(stream.toString());
        stream.end();
      });
    });
  }
}

module.exports = PolyfillsTransform;
