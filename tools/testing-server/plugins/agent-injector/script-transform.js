const path = require("path");
const { Transform } = require("stream");
const { paths } = require("../../constants");
const fs = require("fs");

/**
 * Transforms requests for HTML files that contain the \{script\} string with the
 * deserialized script query param. If a script query param is not provided, the
 * string will simply be removed.
 */
module.exports = function (request, reply, testServer) {
  return new Transform({
    async transform(chunk, encoding, done) {
      let chunkString = chunk.toString();

      const testScriptInjections = chunkString.matchAll(
        new RegExp(
          `{(${path.relative(paths.rootDir, paths.testsAssetsDir)}/.*?)}`,
          "ig"
        )
      );
      for (let match of testScriptInjections) {
        const scriptPath = path.resolve(paths.rootDir, match[1]);
        const scriptFileStats = await fs.promises.stat(scriptPath);

        if (!scriptFileStats.isFile()) {
          throw new Error(`Could not find script file ${match[1]}`);
        }

        const script = (await fs.promises.readFile(scriptPath)).toString();
        chunkString = chunkString.replace(
          match[0],
          `<script type="text/javascript">${script}</script>`
        );
      }

      if (chunkString.indexOf("{script}") > -1) {
        done(
          null,
          chunkString.replace(
            "{script}",
            `<script type="text/javascript" src="${
              request.query.script || ""
            }"></script>`
          )
        );
      } else {
        done(null, chunkString);
      }
    },
  });
};
