import { FeatureBase } from "./feature-base";

export class AggregateBase extends FeatureBase {
  constructor(agentIdentifier, aggregator, featureName) {
    super(agentIdentifier, aggregator, featureName);
  }
}
