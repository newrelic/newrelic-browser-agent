const { Transform } = require("stream");
const sslShim = require("./ssl-shim");

/**
 * Transforms requests for HTML files that contain the \{init\} string with the
 * default agent init merged with the deserialized init query param value, if
 * it was provided. The transform also injects the init option to disable SSL
 * to support testing the agent without the need for an SSL server.
 */
class InitTransform extends Transform {
  static #REGEXP_REPLACEMENT_REGEX = /"new RegExp\('(.*?)','(.*?)'\)"/g;
  #reqParams;
  #injectUpdatedLoaderConfig;

  constructor(reqParams, transformOptions) {
    super(transformOptions);

    this.#reqParams = reqParams;
    this.#injectUpdatedLoaderConfig =
      reqParams.injectUpdatedLoaderConfig === "true";
  }

  _transform(chunk, encoding, done) {
    const chunkString = chunk.toString();

    if (chunkString.indexOf("{init}") > -1) {
      const replacement = this.#getInitContent();
      done(
        null,
        chunkString.replace(
          "{init}",
          `<script type="text/javascript">${replacement}</script>`
        )
      );
    } else {
      done(null, chunkString);
    }
  }

  #getInitContent() {
    let initString = this.#parseInitFromQueryString();
    if (initString.includes("new RegExp")) {
      // de-serialize RegExp obj from router
      initString = initString.replace(
        InitTransform.#REGEXP_REPLACEMENT_REGEX,
        "/$1/$2"
      );
    }
    return `${sslShim}window.NREUM||(NREUM={});NREUM.init=${initString}`;
  }

  #parseInitFromQueryString() {
    if (!this.#reqParams.init) {
      return "{}";
    }

    return Buffer.from(this.#reqParams.init, "base64").toString();
  }
}

module.exports = InitTransform;
