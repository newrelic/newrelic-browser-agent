import logger from "@wdio/logger";
import TestServer from "../../../testing-server/index.js";
import startCommandServer from "./command-server.mjs";

const log = logger("jil-testing-server");

/**
 * This is a WDIO launcher plugin that starts the testing servers and command server
 * that allows WDIO child processes to communicate with the testing servers.
 */
export default class TestingServerLauncher {
  static #defaultAgentConfig = {
    licenseKey: "asdf",
    applicationID: 42,
    accountID: 123,
    agentID: 456,
    trustKey: 789,
  };
  #opts;
  #testingServer;
  #commandServer;
  #commandPort;

  constructor(opts) {
    this.#opts = opts;
    this.#testingServer = new TestServer(
      opts,
      TestingServerLauncher.#defaultAgentConfig,
      log
    );
  }

  async onPrepare(_, capabilities) {
    await this.#testingServer.start();
    const { commandServer, commandPort } = await startCommandServer(
      this.#testingServer,
      log
    );

    log.info(`Asset server started on http://${this.#testingServer.assetServer.host}:${this.#testingServer.assetServer.port}`);
    log.info(`CORS server started on http://${this.#testingServer.corsServer.host}:${this.#testingServer.corsServer.port}`);
    log.info(`Collector server started on http://${this.#testingServer.collectorServer.host}:${this.#testingServer.collectorServer.port}`);

    capabilities.forEach((capability) => {
      capability["jil:testServerCommandPort"] = commandPort;
    });

    this.#commandServer = commandServer;
    this.#commandPort = commandPort;
    log.info(`Command server started on http://localhost:${commandPort}`);
  }

  async onComplete() {
    await this.#testingServer.stop();
    this.#commandServer.forceShutdown();
  }
}
