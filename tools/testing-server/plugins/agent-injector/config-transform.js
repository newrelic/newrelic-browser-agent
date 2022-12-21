const { Transform } = require("stream");
const debugShim = require("./debug-shim");
const sslShim = require("./ssl-shim");

/**
 * Transforms requests for HTML files that contain the \{config\} string with the
 * default agent config merged with the deserialized config query param value, if
 * it was provided. The transform also injects the debug shim if debugging has been
 * enabled via the CLI.
 */
class ConfigTransform extends Transform {
  #reqParams;
  #testServerConfig;
  #injectUpdatedLoaderConfig;

  constructor(reqParams, testServerConfig, transformOptions) {
    super(transformOptions);

    this.#reqParams = reqParams;
    this.#testServerConfig = testServerConfig;
    this.#injectUpdatedLoaderConfig =
      reqParams.injectUpdatedLoaderConfig === "true";
  }

  _transform(chunk, encoding, done) {
    const chunkString = chunk.toString();

    if (chunkString.indexOf("{config}") > -1) {
      const replacement = this.#getConfigContent();
      done(
        null,
        chunkString.replace(
          "{config}",
          `<script type="text/javascript">${replacement}</script>`
        )
      );
    } else {
      done(null, chunkString);
    }
  }

  #getConfigContent(loaderName, params, ssl, injectUpdatedLoaderConfig) {
    const config = this.#generateConfig(
      loaderName,
      params,
      ssl,
      injectUpdatedLoaderConfig
    );
    const infoJSON = JSON.stringify(config.info);
    const loaderConfigJSON = JSON.stringify(config.loaderConfig);
    const loaderConfigAssignment = this.#injectUpdatedLoaderConfig
      ? `NREUM.loader_config=${loaderConfigJSON};`
      : "";

    return `${sslShim}window.NREUM||(NREUM={});NREUM.info=${infoJSON};${loaderConfigAssignment}${
      this.#testServerConfig.cliOpts.debugShim ? debugShim : ""
    }`;
  }

  #generateConfig() {
    let config = {
      agent: `${this.#testServerConfig.cliOpts.host}:${
        this.#testServerConfig.serverConfig.assetServerPort
      }/build/nr.js`,
      beacon: `${this.#testServerConfig.cliOpts.host}:${
        this.#testServerConfig.serverConfig.collectorServerPort
      }`,
      errorBeacon: `${this.#testServerConfig.cliOpts.host}:${
        this.#testServerConfig.serverConfig.collectorServerPort
      }`,
      ...this.#testServerConfig.agentConfig,
      ...(this.#parseConfigFromQueryString() || {}),
    };

    const loaderConfigKeys = [
      "accountID",
      "agentID",
      "applicationID",
      "licenseKey",
      "trustKey",
    ];

    const loaderOnlyConfigKeys = ["accountID", "agentID", "trustKey"];

    let updatedConfig = {
      info: {},
      loaderConfig: {},
    };

    for (const key in config) {
      if (this.#injectUpdatedLoaderConfig) {
        if (loaderConfigKeys.includes(key)) {
          // this simulates the collector injects only the primary app ID
          if (key === "applicationID") {
            const primaryAppId = config[key].toString().split(",")[0];
            updatedConfig.loaderConfig[key] = primaryAppId;
          } else {
            updatedConfig.loaderConfig[key] = config[key];
          }
        }
      }

      // add all keys to `info` except the ones that exist only in `loader_config`
      if (!loaderOnlyConfigKeys.includes(key)) {
        updatedConfig.info[key] = config[key];
      }
    }

    return updatedConfig;
  }

  #parseConfigFromQueryString() {
    if (!this.#reqParams.config) {
      return {};
    }

    let configString = Buffer.from(this.#reqParams.config, "base64").toString();
    return JSON.parse(configString);
  }
}

module.exports = ConfigTransform;
