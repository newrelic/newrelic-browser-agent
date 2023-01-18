const path = require("path");
const Router = require("./router");
const fastify = require("fastify");
const { urlFor } = require("./utils/url");
const waitOn = require("wait-on");

class TestServer {
  #config;
  #agentConfig;
  #output;
  #testServerConfig;
  #assetServer;
  #corsServer;
  #collectorServer;

  constructor(config, agentConfig, output) {
    this.#config = config;
    this.#agentConfig = agentConfig;
    this.#output = output;
    this.#testServerConfig = {
      cliOpts: config,
      agentConfig,
      serverConfig: {
        assetServerPort: 0,
        corsServerPort: 0,
        collectorServerPort: 0,
      },
      paths: {
        rootDir: path.resolve(__dirname, "../../"),
        builtAssetsDir: path.resolve(__dirname, "../../build/"),
        testsRootDir: path.resolve(__dirname, "../../tests/"),
        testsAssetsDir: path.resolve(__dirname, "../../tests/assets/"),
        testsBrowserDir: path.resolve(__dirname, "../../tests/browser/"),
      },
    };

    this.#createAssetServer();
    this.#createCorsServer();
    this.#createCollectorServer();
  }

  async start() {
    await Promise.all([
      this.#assetServer.listen({ host: '0.0.0.0', port: this.#config.port }),
      this.#corsServer.listen({ host: '0.0.0.0', port: 0 }),
      this.#collectorServer.start(),
    ]);

    this.#testServerConfig.serverConfig.assetServerPort = this.#getServerPort(
      this.#assetServer
    );
    this.#testServerConfig.serverConfig.corsServerPort = this.#getServerPort(
      this.#corsServer
    );
    this.#testServerConfig.serverConfig.collectorServerPort =
      this.#collectorServer.port;

    await waitOn({
      resources: [
        `http-get://127.0.0.1:${
          this.#testServerConfig.serverConfig.assetServerPort
        }/`,
        `http-get://127.0.0.1:${
          this.#testServerConfig.serverConfig.corsServerPort
        }/json`,
      ],
    });
  }

  async stop() {
    await Promise.all([this.#assetServer.close(), this.#corsServer.close()]);
    this.#collectorServer.stop();
  }

  get defaultAgentConfig() {
    return this.#agentConfig;
  }

  get router() {
    return this.#collectorServer;
  }

  get host() {
    return this.#config.host;
  }

  get port() {
    return this.#testServerConfig.serverConfig.assetServerPort;
  }

  get corsServer() {
    return {
      port: this.#testServerConfig.serverConfig.corsServerPort,
    };
  }

  /**
   * Backwards compatibility with existing collector server.
   */
  serveAsset(req, res) {
    this.#assetServer.routing(req, res);
  }

  /**
   * Backwards compatibility with existing collector server.
   */
  urlFor(relativePath, options) {
    return urlFor(relativePath, options, this.#testServerConfig);
  }

  #createAssetServer() {
    this.#assetServer = fastify({
      maxParamLength: Number.MAX_SAFE_INTEGER,
      bodyLimit: Number.MAX_SAFE_INTEGER,
      logger: this.#config.logRequests
        ? {
            transport: {
              target: "pino-pretty",
            },
          }
        : false,
    });

    this.#assetServer.register(require("@fastify/multipart"), {
      addToBody: true,
    });
    this.#assetServer.register(require("@fastify/cors"), {
      origin: true,
      credentials: true,
      exposedHeaders: "X-NewRelic-App-Data",
    });
    this.#assetServer.register(require("@fastify/static"), {
      root: this.#testServerConfig.paths.rootDir,
      prefix: "/",
      index: false,
      cacheControl: false,
      etag: false,
    });
    this.#assetServer.register(
      require("./plugins/agent-injector"),
      this.#testServerConfig
    );
    this.#assetServer.register(
      require("./plugins/browserify"),
      this.#testServerConfig
    );
    this.#assetServer.register(
      require("./routes/tests-index"),
      this.#testServerConfig
    );
    this.#assetServer.register(
      require("./routes/test-routes"),
      this.#testServerConfig
    );
    this.#assetServer.register(require("./plugins/no-cache"));
  }

  #createCorsServer() {
    this.#corsServer = fastify({
      maxParamLength: Number.MAX_SAFE_INTEGER,
      bodyLimit: Number.MAX_SAFE_INTEGER,
      logger: this.#config.logRequests
        ? {
            transport: {
              target: "pino-pretty",
            },
          }
        : false,
    });

    this.#corsServer.register(require("@fastify/multipart"), {
      addToBody: true,
    });
    this.#corsServer.register(require("@fastify/cors"), {
      origin: true,
      credentials: true,
      exposedHeaders: "X-NewRelic-App-Data",
    });
    this.#corsServer.register(
      require("./routes/test-routes"),
      this.#testServerConfig
    );
    this.#assetServer.register(require("./plugins/no-cache"));
  }

  #createCollectorServer() {
    this.#collectorServer = new Router(this, this.#config, this.#output);
  }

  /**
   * Determines the port the provided server is listening on. Only returns
   * the first found port.
   * @param {FastifyInstance} server The server to get the port for
   * @return {number} The port the target server is listening on
   */
  #getServerPort(server) {
    const listeningAddresses = server.addresses();
    if (Array.isArray(listeningAddresses) && listeningAddresses.length > 0) {
      return listeningAddresses[0].port;
    }

    return 0;
  }
}

module.exports = TestServer;
