const { Transform } = require("stream");

/**
 * Transforms requests for HTML files that contain the \{worker-commands\} string
 * with the deserialized workerCommands query param. If a workerCommands query
 * param is not provided, the string will simply be removed.
 */
class WorkerCommandsTransform extends Transform {
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

    if (chunkString.indexOf("{worker-commands}") > -1) {
      const replacement = this.#getWorkerCommandsContent();
      done(
        null,
        chunkString.replace(
          "{worker-commands}",
          `<script type="text/javascript">${replacement}</script>`
        )
      );
    } else {
      done(null, chunkString);
    }
  }

  #getWorkerCommandsContent() {
    return `workerCommands=${this.#parseWorkerCommandsFromQueryString()};`;
  }

  #parseWorkerCommandsFromQueryString() {
    if (!this.#reqParams.workerCommands) {
      return "[]";
    }

    return Buffer.from(this.#reqParams.workerCommands, "base64").toString();
  }
}

module.exports = WorkerCommandsTransform;
