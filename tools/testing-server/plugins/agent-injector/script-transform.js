const { Transform } = require("stream");

/**
 * Transforms requests for HTML files that contain the \{script\} string with the
 * deserialized script query param. If a script query param is not provided, the
 * string will simply be removed.
 */
class ScriptTransform extends Transform {
  #reqParams;

  constructor(reqParams, transformOptions) {
    super(transformOptions);

    this.#reqParams = reqParams;
  }

  async _transform(chunk, encoding, done) {
    const chunkString = chunk.toString();

    if (chunkString.indexOf("{script}") > -1) {
      const replacement = await this.#getScriptContent();
      done(
        null,
        chunkString.replace(
          "{script}",
          `<script type="text/javascript" src="${replacement}"></script>`
        )
      );
    } else {
      done(null, chunkString);
    }
  }

  #getScriptContent() {
    if (!this.#reqParams.script) {
      return "";
    }

    return decodeURIComponent(this.#reqParams.script);
  }
}

module.exports = ScriptTransform;
