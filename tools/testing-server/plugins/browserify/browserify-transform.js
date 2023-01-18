const { Transform } = require("stream");
const browserify = require("browserify");
const runnerArgs = require("jil/runner/args");
const preprocessify = require("preprocessify");

/**
 * Transforms requests for JS files by passing them through browserify for
 * transpilation.
 */
class BrowserifyTransform extends Transform {
  #scriptName;
  #cache;

  constructor(scriptName, cache, transformOptions) {
    super(transformOptions);

    this.#scriptName = scriptName;
    this.#cache = cache;
  }

  async _transform(chunk, encoding, done) {
    if (this.#cache && this.#cache.has(this.#scriptName)) {
      return done(null, this.#cache.get(this.#scriptName));
    }

    const transformedScript = await this.#browserifyScript();

    if (this.#cache) {
      this.#cache.set(this.#scriptName, transformedScript);
    }

    done(null, transformedScript);
  }

  #browserifyScript() {
    return new Promise((resolve, reject) => {
      browserify(this.#scriptName)
        .transform("babelify", {
          presets: [
            [
              "@babel/preset-env",
              {
                loose: true,
                targets: {
                  browsers: runnerArgs.polyfills
                    ? ["ie >= 11"]
                    : [
                        "last 10 Chrome versions",
                        "last 10 Safari versions",
                        "last 10 Firefox versions",
                        "last 10 Edge versions",
                        "last 10 ChromeAndroid versions",
                        "last 10 iOS versions"
                      ],
                },
              },
            ],
          ],
          plugins: [
            "@babel/plugin-syntax-dynamic-import",
            "@babel/plugin-transform-modules-commonjs",
            "@babel/plugin-proposal-optional-chaining",
            [
              "module-resolver",
              {
                alias: {
                  "@newrelic/browser-agent-core/src":
                    "./dist/packages/browser-agent-core/src",
                },
              },
            ],
          ],
          global: true,
        })
        .transform(preprocessify())
        .bundle((err, buf) => {
          if (err) {
            return reject(err);
          }

          let content = buf.toString();
          resolve(content);
        });
    });
  }
}

module.exports = BrowserifyTransform;
