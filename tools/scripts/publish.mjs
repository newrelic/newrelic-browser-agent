/**
 * This script is used to publish packages to npm.
 * @copyright New Relic Corporation 2022. All rights reserved.
 * @license Apache-2.0
 */

import * as path from "node:path";
import { fileURLToPath } from "url";
import { createProjectGraphAsync, logger } from "@nrwl/devkit";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const [, , tag, ...additionalArgs] = process.argv;
  const projectGraph = await createProjectGraphAsync();

  for (const node in projectGraph.nodes) {
    try {
      logger.info(`Publishing package ${node}`);

      const outputPath = path.resolve(
        path.join(
          __dirname,
          "../../",
          projectGraph.nodes[node].data.targets.build.options.outputPath
        )
      );

      execSync(`npm publish --tag ${tag} ${additionalArgs.join(" ")}`, {
        cwd: outputPath,
        stdio: "inherit"
      });
    } catch (err) {
      logger.error(err);
      process.exit(1);
    }
  }

  process.exit(0);
})().catch((err) => {
  logger.error(err);
  process.exit(1);
});
