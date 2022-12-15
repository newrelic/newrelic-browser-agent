/**
 * This script is used to version packages.
 * @copyright New Relic Corporation 2022. All rights reserved.
 * @license Apache-2.0
 */

import * as path from "node:path";
import { fileURLToPath } from "url";
import { createProjectGraphAsync, logger } from "@nrwl/devkit";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const [, , version, ...additionalArgs] = process.argv;
  const projectGraph = await createProjectGraphAsync();

  for (const node in projectGraph.nodes) {
    try {
      logger.info(`Bumping version for packages ${node}`);

      const packagePath = path.resolve(
        path.join(__dirname, "../../", projectGraph.nodes[node].data.root)
      );

      execSync(`npm version ${version} ${additionalArgs.join(" ")}`, {
        cwd: packagePath,
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
