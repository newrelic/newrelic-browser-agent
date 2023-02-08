// loader files
import { getEnabledFeatures } from "./features/enabled-features";
import { configure } from "./configure/configure";
// core files
import { Aggregator } from "../common/aggregate/aggregator";
import { gosNREUMInitializedAgents } from "../common/window/nreum";
import { generateRandomHexString } from "../common/ids/unique-id";
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from "../common/config/config";
import { FEATURE_NAMES } from "./features/features";
import { warn } from "../common/util/console";

const nonAutoFeatures = [FEATURE_NAMES.jserrors, FEATURE_NAMES.pageAction];

const autoFeatures = [FEATURE_NAMES.metrics];

export class MicroAgent {
  constructor(options, agentIdentifier = generateRandomHexString(16)) {
    this.agentIdentifier = agentIdentifier;
    this.sharedAggregator = new Aggregator({
      agentIdentifier: this.agentIdentifier,
    });
    this.features = {};

    Object.assign(
      this,
      configure(
        this.agentIdentifier,
        { ...options, runtime: { isolatedBacklog: true } },
        options.loaderType || "micro-agent"
      )
    );

    this.start();
  }

  get config() {
    return {
      info: getInfo(this.agentIdentifier),
      init: getConfiguration(this.agentIdentifier),
      loader_config: getLoaderConfig(this.agentIdentifier),
      runtime: getRuntime(this.agentIdentifier),
    };
  }

  start() {
    try {
      const enabledFeatures = getEnabledFeatures(this.agentIdentifier);
      autoFeatures.forEach((f) => {
        if (enabledFeatures[f]) {
          import(`../features/${f}/instrument`)
            .then(({ Instrument }) => {
              this.features[f] = new Instrument(this.agentIdentifier, this.sharedAggregator);
            })
            .catch((err) => warn("Something prevented the agent from being downloaded."));
        }
      });
      nonAutoFeatures.forEach((f) => {
        if (enabledFeatures[f]) {
          import(`../features/${f}/aggregate`)
            .then(({ Aggregate }) => {
              this.features[f] = new Aggregate(this.agentIdentifier, this.sharedAggregator);
            })
            .catch((err) => warn("Something prevented the agent from being downloaded."));
        }
      });
      gosNREUMInitializedAgents(this.agentIdentifier, this.features, "features");
      return this;
    } catch (err) {
      warn("Failed to initialize instrument classes.", err);
      return false;
    }
  }
}
